import { and, count, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { profiles, skills, userSkills, users } from "@/db/schema";
import { ApiError } from "@/lib/api-error";
import { hashPassword } from "@/lib/password";

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export function toPublicUser(user, { withEmail = false } = {}) {
  if (!user) {
    return null;
  }
  const profile = user.profile ?? null;
  const skillsList = (user.skills ?? []).map((link) => ({
    id: link.skill.id,
    name: link.skill.name,
  }));
  const result = {
    id: user.id,
    fullName: user.fullName,
    username: user.username ?? null,
    accountType: user.accountType ?? "student",
    profilePhoto: user.profilePhoto ?? null,
    github: user.github ?? null,
    linkedin: user.linkedin ?? null,
    location: user.location ?? null,
    college: user.college ?? null,
    graduationYear: user.graduationYear ?? null,
    currentRole: user.currentRole ?? null,
    company: user.company ?? null,
    profile: profile
      ? { bio: profile.bio, department: profile.department, year: profile.year }
      : null,
    skills: skillsList,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
  if (withEmail) {
    result.email = user.email;
  }
  return result;
}

function serializeSearchRow(row, skillNames = []) {
  const profile =
    row.bio || row.department || row.year
      ? { bio: row.bio, department: row.department, year: row.year }
      : null;
  return {
    id: row.id,
    fullName: row.fullName,
    username: row.username ?? null,
    accountType: row.accountType ?? "student",
    profilePhoto: row.profilePhoto ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    profile,
    // Skills ride along with every search row so the client can match queries
    // like "React" without a second round trip per profile.
    skills: skillNames,
  };
}

export async function getUserById(id) {
  return db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, id),
    with: {
      profile: true,
      skills: { with: { skill: true } },
    },
  });
}

export async function getPublicUserById(id, opts) {
  const user = await getUserById(id);
  if (!user) {
    throw new ApiError(404, "User not found", "NOT_FOUND");
  }
  return toPublicUser(user, opts);
}

export async function getUserByEmail(email) {
  return db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, normalizeEmail(email)),
  });
}

export async function createUser({ email, fullName, password, ...fields }) {
  const normalizedEmail = normalizeEmail(email);
  const existing = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, normalizedEmail),
  });
  if (existing) {
    throw new ApiError(409, "An account with this email already exists", "EMAIL_TAKEN");
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({
      email: normalizedEmail,
      fullName,
      passwordHash,
      username: fields.username ?? null,
      profilePhoto: fields.profilePhoto ?? null,
      accountType: fields.accountType ?? "student",
      graduationYear: fields.graduationYear ?? null,
      currentRole: fields.currentRole ?? null,
      company: fields.company ?? null,
    })
    .returning();

  await db
    .insert(profiles)
    .values({
      userId: user.id,
      department: fields.department ?? null,
      year: fields.year ?? null,
    })
  const created = await getUserById(user.id);
  return created;
}

const ACTIVE_USER_PROFILE_FIELDS = [
  "fullName",
  "username",
  "accountType",
  "profilePhoto",
  "github",
  "linkedin",
  "location",
  "college",
  "graduationYear",
  "currentRole",
  "company",
];

const PASSIVE_PROFILE_FIELDS = ["bio", "department", "year"];

export async function updateOwnProfile(userId, data) {
  const userPatch = {};
  for (const key of ACTIVE_USER_PROFILE_FIELDS) {
    if (data[key] !== undefined) {
      userPatch[key] = key === "accountType" ? (data[key] ?? "student") : (data[key] ?? null);
    }
  }

  const profilePatch = {};
  for (const key of PASSIVE_PROFILE_FIELDS) {
    if (data[key] !== undefined) {
      profilePatch[key] = data[key];
    }
  }

  await db.transaction(async (tx) => {
    if (Object.keys(userPatch).length > 0) {
      await tx
        .update(users)
        .set({ ...userPatch, updatedAt: Date.now() })
        .where(eq(users.id, userId));
    }

    if (Object.keys(profilePatch).length > 0) {
      await tx
        .update(profiles)
        .set({ ...profilePatch, updatedAt: Date.now() })
        .where(eq(profiles.userId, userId));
    }

    if (data.skills !== undefined) {
      await tx.delete(userSkills).where(eq(userSkills.userId, userId));
      const normalized = (data.skills ?? []).map((n) => n.trim()).filter(Boolean);
      const seen = new Map();
      for (const name of normalized) {
        const key = name.toLowerCase();
        if (!seen.has(key)) {
          seen.set(key, name);
        }
      }
      const uniqueNames = [...seen.values()];
      for (const name of uniqueNames) {
        const skillId = await ensureSkill(tx, name);
        await tx.insert(userSkills).values({ userId, skillId }).onConflictDoNothing();
      }
    }
  });

  const updated = await getUserById(userId);
  return toPublicUser(updated, { withEmail: true });
}

async function ensureSkill(client, name) {
  const trimmed = name.trim();
  const lowerName = trimmed.toLowerCase();
  const [existing] = await client
    .select({ id: skills.id, name: skills.name })
    .from(skills)
    .where(sql`lower(${skills.name}) = ${lowerName}`)
    .limit(1);
  if (existing) {
    return existing.id;
  }
  // Two concurrent profile updates can race to create the same new skill.
  // onConflictDoNothing turns the losing insert into a no-op instead of a
  // raw unique-constraint error; we then resolve the winning row's id.
  const [created] = await client
    .insert(skills)
    .values({ name: trimmed })
    .onConflictDoNothing()
    .returning();
  if (created) {
    return created.id;
  }
  const [winner] = await client
    .select({ id: skills.id })
    .from(skills)
    .where(sql`lower(${skills.name}) = ${lowerName}`)
    .limit(1);
  return winner.id;
}

function escapeLike(input) {
  // Escape LIKE wildcards (% and _) and the escape character itself so user
  // input is matched literally instead of acting as a pattern.
  return input.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function likeCondition(column, value) {
  // ILIKE, not LIKE: Postgres LIKE is case-sensitive whereas the SQLite dialect
  // this replaced was not, so a lowercased query would silently stop matching
  // stored names. `escape '\'` stays valid and keeps wildcards in user input
  // literal.
  const pattern = `%${escapeLike(value)}%`;
  return sql`${column} ilike ${pattern} escape '\\'`;
}

export async function searchUsers({ query, page, limit, accountType }) {
  const conditions = [];
  if (query) {
    conditions.push(
      or(
        likeCondition(users.fullName, query),
        likeCondition(profiles.department, query)
      )
    );
  }
  if (accountType) {
    conditions.push(eq(users.accountType, accountType));
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      username: users.username,
      accountType: users.accountType,
      profilePhoto: users.profilePhoto,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      bio: profiles.bio,
      department: profiles.department,
      year: profiles.year,
    })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(where);

  // Batch-load skills for the page of results; one query instead of N.
  const userIds = rows.map((row) => row.id);
  const skillsByUser = new Map();

  if (userIds.length > 0) {
    const skillRows = await db
      .select({ userId: userSkills.userId, name: skills.name })
      .from(userSkills)
      .innerJoin(skills, eq(skills.id, userSkills.skillId))
      .where(inArray(userSkills.userId, userIds));

    for (const row of skillRows) {
      const list = skillsByUser.get(row.userId) ?? [];
      list.push(row.name);
      skillsByUser.set(row.userId, list);
    }
  }

  return {
    users: rows.map((row) =>
      serializeSearchRow(row, skillsByUser.get(row.id) ?? [])
    ),
    total,
    page,
    limit,
  };
}
