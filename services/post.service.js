import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { comments, postLikes, posts } from "@/db/schema";
import { ApiError } from "@/lib/api-error";
import { toPublicUser } from "./user.service";

export function toPublicComment(comment) {
  return {
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    author: toPublicUser({
      ...comment.user,
      skills: undefined,
    }),
  };
}

export function toPublicPost(post, { viewerId } = {}) {
  return {
    id: post.id,
    content: post.content,
    image: post.image ?? null,
    likes: post.likes,
    comments: post.comments,
    isLiked: viewerId != null && (post.viewerLiked ? Boolean(post.viewerLiked) : false),
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author: toPublicUser({ ...post.author }),
  };
}

export async function getPostById(id) {
  return db.query.posts.findFirst({
    where: (p, { eq }) => eq(p.id, id),
    with: {
      author: { with: { profile: true } },
    },
  });
}

export async function getPublicPostById(id, { viewerId } = {}) {
  const post = await getPostById(id);
  if (!post) {
    throw new ApiError(404, "Post not found", "NOT_FOUND");
  }
  const viewerLiked = viewerId != null
    ? !!(await db.query.postLikes.findFirst({
        where: (l, { and, eq }) =>
          and(eq(l.postId, id), eq(l.userId, viewerId)),
      }))
    : false;
  return toPublicPost({ ...post, viewerLiked }, { viewerId });
}

export async function createPost(userId, { content, image }) {
  const [post] = await db
    .insert(posts)
    .values({ userId, content, image: image ?? null })
    .returning();
  const created = await getPostById(post.id);
  return toPublicPost(created);
}

async function getViewerLikedSet(viewerId, postIds) {
  if (viewerId == null || postIds.length === 0) {
    return new Set();
  }
  const rows = await db
    .select({ postId: postLikes.postId })
    .from(postLikes)
    .where(and(inArray(postLikes.postId, postIds), eq(postLikes.userId, viewerId)));
  return new Set(rows.map((row) => row.postId));
}

export async function listPosts({ page, limit, viewerId } = {}) {
  const rows = await db.query.posts.findMany({
    orderBy: (p, { desc }) => [desc(p.createdAt), desc(p.id)],
    limit,
    offset: (page - 1) * limit,
    with: {
      author: { with: { profile: true } },
    },
  });

  const liked = await getViewerLikedSet(
    viewerId,
    rows.map((post) => post.id)
  );

  const total = await db.$count(posts);

  return {
    posts: rows.map((post) =>
      toPublicPost({ ...post, viewerLiked: liked.has(post.id) }, { viewerId })
    ),
    total,
    page,
    limit,
  };
}

export async function updatePost(id, userId, { content, image }) {
  const existing = await getPostById(id);
  if (!existing) {
    throw new ApiError(404, "Post not found", "NOT_FOUND");
  }
  if (existing.userId !== userId) {
    throw new ApiError(403, "You can only update your own posts", "FORBIDDEN");
  }
  const [updated] = await db
    .update(posts)
    .set({ content, image: image ?? null, updatedAt: Date.now() })
    .where(eq(posts.id, id))
    .returning();
  const fresh = await getPostById(updated.id);
  return toPublicPost(fresh);
}

export async function deletePost(id, userId) {
  const existing = await getPostById(id);
  if (!existing) {
    throw new ApiError(404, "Post not found", "NOT_FOUND");
  }
  if (existing.userId !== userId) {
    throw new ApiError(403, "You can only delete your own posts", "FORBIDDEN");
  }
  await db.delete(posts).where(eq(posts.id, id));
}

export async function togglePostLike(postId, userId) {
  const post = await getPostById(postId);
  if (!post) {
    throw new ApiError(404, "Post not found", "NOT_FOUND");
  }

  const existing = await db.query.postLikes.findFirst({
    where: (l, { and, eq }) =>
      and(eq(l.postId, postId), eq(l.userId, userId)),
  });

  let liked;
  if (existing) {
    await db.transaction(async (tx) => {
      await tx
        .delete(postLikes)
        .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
      await tx
        .update(posts)
        .set({
          likes: sql`greatest(0, ${posts.likes} - 1)`,
          updatedAt: Date.now(),
        })
        .where(eq(posts.id, postId))
    });
    liked = false;
  } else {
    await db.transaction(async (tx) => {
      await tx
        .insert(postLikes)
        .values({ postId, userId })
        .onConflictDoNothing()
      await tx
        .update(posts)
        .set({ likes: sql`${posts.likes} + 1`, updatedAt: Date.now() })
        .where(eq(posts.id, postId))
    });
    liked = true;
  }

  const [fresh] = await db
    .select({ likes: posts.likes })
    .from(posts)
    .where(eq(posts.id, postId));
  return { liked, likes: fresh.likes };
}

export async function createComment(postId, userId, content) {
  const post = await getPostById(postId);
  if (!post) {
    throw new ApiError(404, "Post not found", "NOT_FOUND");
  }
  const [comment] = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(comments)
      .values({ postId, userId, content })
      .returning();
    await tx
      .update(posts)
      .set({ comments: sql`${posts.comments} + 1`, updatedAt: Date.now() })
      .where(eq(posts.id, postId))
    return [row];
  });
  const created = await db.query.comments.findFirst({
    where: (c, { eq }) => eq(c.id, comment.id),
    with: {
      user: { with: { profile: true, skills: { with: { skill: true } } } },
    },
  });
  return toPublicComment(created);
}

export async function listComments(postId, { page, limit }) {
  const rows = await db.query.comments.findMany({
    where: (c, { eq }) => eq(c.postId, postId),
    orderBy: (c, { desc }) => desc(c.createdAt),
    limit,
    offset: (page - 1) * limit,
    with: {
      user: { with: { profile: true, skills: { with: { skill: true } } } },
    },
  });

  const total = await db.$count(comments, eq(comments.postId, postId));

  return {
    comments: rows.map(toPublicComment),
    total,
    page,
    limit,
  };
}
