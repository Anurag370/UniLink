import { and, count, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { connections, messages, users } from "@/db/schema";
import { ApiError } from "@/lib/api-error";
import { createNotification } from "./notification.service";

function toPublicMessage(row) {
  return {
    id: row.id,
    senderId: row.senderId,
    receiverId: row.receiverId,
    text: row.text,
    read: Boolean(row.read),
    createdAt: row.createdAt,
  };
}

// A peer counts as "online" when their heartbeat is fresher than this
// window; requireUser() refreshes the heartbeat at most once a minute.
const PRESENCE_WINDOW_MS = 5 * 60 * 1000;

function activeStateOf(lastActiveAt) {
  return lastActiveAt && Date.now() - lastActiveAt < PRESENCE_WINDOW_MS
    ? "online"
    : "offline";
}

function peerProfileKey(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    profilePhoto: user.profilePhoto ?? null,
    activeState: activeStateOf(user.lastActiveAt),
    profile: user.profile
      ? {
          bio: user.profile.bio,
          department: user.profile.department,
          year: user.profile.year,
        }
      : null,
  };
}

async function areConnected(a, b) {
  const row = await db.query.connections.findFirst({
    where: (c, { and, eq }) =>
      and(
        eq(c.pairKey, [a, b].sort((x, y) => x - y).join(":")),
        eq(c.status, "accepted")
      ),
  });
  return Boolean(row);
}

export async function sendMessage({ senderId, receiverId, text }) {
  if (senderId === receiverId) {
    throw new ApiError(400, "You cannot message yourself", "SELF_MESSAGE");
  }

  const receiver = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, receiverId),
  });
  if (!receiver) {
    throw new ApiError(404, "User not found", "NOT_FOUND");
  }

  const connected = await areConnected(senderId, receiverId);
  if (!connected) {
    throw new ApiError(
      403,
      "You can only message people you are connected with",
      "NOT_CONNECTED"
    );
  }

  const [row] = await db
    .insert(messages)
    .values({ senderId, receiverId, text })
    .returning();

  const sender = await db
    .select({ fullName: users.fullName })
    .from(users)
    .where(eq(users.id, senderId))
    .limit(1);

  await createNotification({
    userId: receiverId,
    senderId,
    type: "message",
    message: `${sender[0]?.fullName ?? "A user"} sent you a message.`,
    link: `/messages/${senderId}`,
  });

  return toPublicMessage(row);
}

export async function listConversation(userId, otherUserId, { page, limit }) {
  const between = and(
    or(
      and(eq(messages.senderId, userId), eq(messages.receiverId, otherUserId)),
      and(eq(messages.senderId, otherUserId), eq(messages.receiverId, userId))
    )
  );

  const rows = await db
    .select()
    .from(messages)
    .where(between)
    .orderBy(desc(messages.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const total = await db.$count(messages, between);

  // The thread page polls this endpoint, so the peer's presence rides along
  // with the messages instead of needing a separate endpoint.
  const peer = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, otherUserId),
    columns: { id: true, lastActiveAt: true },
  });

  return {
    messages: rows.map(toPublicMessage),
    peer: peer
      ? { id: peer.id, activeState: activeStateOf(peer.lastActiveAt) }
      : null,
    total,
    page,
    limit,
  };
}

export async function markConversationAsRead(userId, otherUserId) {
  await db
    .update(messages)
    .set({ read: true, updatedAt: Date.now() })
    .where(
      and(eq(messages.receiverId, userId), eq(messages.senderId, otherUserId))
    )
}

export async function getUnreadCount(userId) {
  return db.$count(
    messages,
    and(eq(messages.receiverId, userId), eq(messages.read, false))
  );
}

export async function listConversations(userId, { page, limit }) {
  // Peers are discovered with a single CASE expression rather than a UNION of
  // the two directions, so the result has one real column name to order and map
  // by. The previous version called `db.execute({ sql, args })`, which is not a
  // method on this dialect at all.
  const peers = () =>
    db
      .selectDistinct({
        peerId: sql`case when ${messages.senderId} = ${userId} then ${messages.receiverId} else ${messages.senderId} end`.as(
          "peer_id"
        ),
      })
      .from(messages)
      .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)));

  const [peerRows, [{ total }]] = await Promise.all([
    peers()
      .orderBy(sql`peer_id desc`)
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ total: count() }).from(peers().as("peers")),
  ]);

  const peerIds = peerRows.map((row) => row.peerId);
  if (peerIds.length === 0) {
    return { conversations: [], total: Number(total), page, limit };
  }

  // One query per concern instead of three per peer.
  const peerParam = (id) => sql`${id}`;
  // sql.join concatenates its chunks verbatim, so the separator is explicit:
  // without it two peer ids render as "$1$2" and Postgres reports a syntax error.
  const peerList = sql.join(peerIds.map(peerParam), sql`, `);

  const [peerUsers, latestResult, unreadRows] = await Promise.all([
    db.query.users.findMany({
      where: (u, { inArray }) => inArray(u.id, peerIds),
      with: { profile: true },
    }),
    // DISTINCT ON keeps the newest message per peer in a single pass. It has no
    // Drizzle builder equivalent, so it goes through the tagged template, which
    // binds parameters as numbered placeholders.
    db.execute(sql`
      select distinct on (peer_id)
        peer_id, id, sender_id, receiver_id, text, read, created_at, updated_at
      from (
        select
          case when sender_id = ${userId} then receiver_id else sender_id end as peer_id,
          id, sender_id, receiver_id, text, read, created_at, updated_at
        from messages
        where (sender_id = ${userId} and receiver_id in (${peerList}))
           or (receiver_id = ${userId} and sender_id in (${peerList}))
      ) scoped
      order by peer_id, created_at desc, id desc
    `),
    db
      .select({ peerId: messages.senderId, count: count() })
      .from(messages)
      .where(
        and(
          inArray(messages.senderId, peerIds),
          eq(messages.receiverId, userId),
          eq(messages.read, false)
        )
      )
      .groupBy(messages.senderId),
  ]);

  const usersById = new Map(peerUsers.map((peer) => [peer.id, peer]));
  // This one query is raw, so its rows arrive snake_cased straight from the
  // driver. They are reshaped to the camelCase keys toPublicMessage expects.
  const latestByPeer = new Map(
    latestResult.rows.map((row) => [
      Number(row.peer_id),
      {
        id: row.id,
        senderId: row.sender_id,
        receiverId: row.receiver_id,
        text: row.text,
        read: row.read,
        createdAt: row.created_at,
      },
    ])
  );
  const unreadByPeer = new Map(
    unreadRows.map((row) => [row.peerId, Number(row.count)])
  );

  // Preserve the descending peer_id ordering the query imposed.
  const conversations = peerIds
    .map((peerId) => {
      const peer = usersById.get(peerId);
      if (!peer) {
        return null;
      }
      const latest = latestByPeer.get(peerId);
      return {
        user: peerProfileKey(peer),
        latestMessage: latest ? toPublicMessage(latest) : null,
        unreadCount: unreadByPeer.get(peerId) ?? 0,
      };
    })
    .filter(Boolean);

  return {
    conversations,
    total: Number(total),
    page,
    limit,
  };
}
