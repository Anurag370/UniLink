import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Timestamps are stored as epoch milliseconds rather than `timestamptz` so the
// JSON API keeps emitting numbers. `mode: "number"` asks the driver to parse
// int8 into a JS number (exact well past 2^53), which keeps `Date.now()`
// round-tripping unchanged. The column must be bigint, not integer: epoch
// milliseconds overflow int4 by three orders of magnitude.
const now = sql`(extract(epoch from now()) * 1000)::bigint`;

const timestamps = {
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(now),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(now),
};

export const accountTypeEnum = pgEnum("account_type", ["student", "alumni"]);
export const connectionStatusEnum = pgEnum("connection_status", [
  "pending",
  "accepted",
  "rejected",
]);
export const projectRoleEnum = pgEnum("project_role", ["member", "owner"]);
export const joinRequestStatusEnum = pgEnum("join_request_status", [
  "pending",
  "accepted",
  "rejected",
]);

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    fullName: text("full_name").notNull(),
    username: text("username"),
    accountType: accountTypeEnum("account_type").notNull().default("student"),
    profilePhoto: text("profile_photo"),
    github: text("github"),
    linkedin: text("linkedin"),
    location: text("location"),
    college: text("college"),
    graduationYear: integer("graduation_year"),
    currentRole: text("current_role"),
    company: text("company"),
    // Presence heartbeat, written at most once a minute by requireUser().
    // Nullable: never-active accounts are simply "offline".
    lastActiveAt: bigint("last_active_at", { mode: "number" }),
    ...timestamps,
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)]
);

export const profiles = pgTable(
  "profiles",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bio: text("bio"),
    department: text("department"),
    year: text("year"),
    ...timestamps,
  },
  // The user <-> profile relationship is 1:1 and enforced here rather than only
  // in application code.
  (table) => [uniqueIndex("profiles_user_unique").on(table.userId)]
);

export const skills = pgTable(
  "skills",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
  },
  // Uniqueness is case-insensitive because lookups go through `lower(name)`.
  // A plain unique index on `name` would let "React" and "react" coexist.
  (table) => [uniqueIndex("skills_name_lower_unique").on(sql`lower(${table.name})`)]
);

export const userSkills = pgTable(
  "user_skills",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    skillId: integer("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey(table.userId, table.skillId)]
);

export const connections = pgTable(
  "connections",
  {
    id: serial("id").primaryKey(),
    requesterId: integer("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    addresseeId: integer("addressee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    pairKey: text("pair_key").notNull(),
    status: connectionStatusEnum("status").notNull().default("pending"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("connections_pair_key_unique").on(table.pairKey),
    index("connections_requester_idx").on(table.requesterId),
    index("connections_addressee_idx").on(table.addresseeId),
  ]
);

export const posts = pgTable(
  "posts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    image: text("image"),
    likes: integer("likes").notNull().default(0),
    comments: integer("comments").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index("posts_user_idx").on(table.userId),
    index("posts_created_idx").on(table.createdAt),
  ]
);

export const postLikes = pgTable(
  "post_likes",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    createdAt: bigint("created_at", { mode: "number" }).notNull().default(now),
  },
  (table) => [
    primaryKey(table.userId, table.postId),
    index("post_likes_post_idx").on(table.postId),
  ]
);

export const comments = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    ...timestamps,
  },
  (table) => [
    index("comments_post_idx").on(table.postId),
    index("comments_user_idx").on(table.userId),
  ]
);

export const opportunities = pgTable(
  "opportunities",
  {
    id: serial("id").primaryKey(),
    ownerId: integer("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    type: text("type").notNull(),
    date: text("date"),
    banner: text("banner"),
    location: text("location"),
    description: text("description"),
    link: text("link"),
    ...timestamps,
  },
  (table) => [
    index("opportunities_owner_idx").on(table.ownerId),
    index("opportunities_created_idx").on(table.createdAt),
  ]
);

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    senderId: integer("sender_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    type: text("type").notNull(),
    message: text("message").notNull(),
    link: text("link"),
    read: boolean("read").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index("notifications_user_idx").on(table.userId),
    index("notifications_read_idx").on(table.read),
  ]
);

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    senderId: integer("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    receiverId: integer("receiver_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    read: boolean("read").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index("messages_sender_idx").on(table.senderId),
    index("messages_receiver_idx").on(table.receiverId),
  ]
);

export const stories = pgTable(
  "stories",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    image: text("image").notNull(),
    expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
    ...timestamps,
  },
  (table) => [index("stories_user_idx").on(table.userId)]
);

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  technologies: text("technologies"),
  github: text("github"),
  demo: text("demo"),
  ...timestamps,
});

export const projectMembers = pgTable(
  "project_members",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: projectRoleEnum("role").notNull().default("member"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("project_members_project_user_unique").on(
      table.projectId,
      table.userId
    ),
    index("project_members_user_idx").on(table.userId),
  ]
);

export const projectJoinRequests = pgTable(
  "project_join_requests",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: joinRequestStatusEnum("status").notNull().default("pending"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("project_join_requests_project_user_unique").on(
      table.projectId,
      table.userId
    ),
    index("project_join_requests_user_idx").on(table.userId),
  ]
);

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
  skills: many(userSkills),
  posts: many(posts),
  // A connection is undirected from either side, so `connections` has two
  // distinct paths back to users. They must be declared separately and matched
  // to `requester` / `addressee` in connectionsRelations, otherwise the
  // relation is ambiguous and `db.query.users` cannot resolve it.
  sentConnectionRequests: many(connections, { relationName: "requester" }),
  receivedConnectionRequests: many(connections, { relationName: "addressee" }),
  projects: many(projects, { relationName: "ownedProjects" }),
  memberships: many(projectMembers),
  joinRequests: many(projectJoinRequests),
  opportunities: many(opportunities, { relationName: "ownedOpportunities" }),
  notifications: many(notifications, { relationName: "receivedNotifications" }),
  sentNotifications: many(notifications, { relationName: "sentNotifications" }),
  sentMessages: many(messages, { relationName: "sentMessages" }),
  receivedMessages: many(messages, { relationName: "receivedMessages" }),
  stories: many(stories),
  postLikes: many(postLikes),
  comments: many(comments),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}));

export const skillsRelations = relations(skills, ({ many }) => ({
  userSkills: many(userSkills),
}));

export const userSkillsRelations = relations(userSkills, ({ one }) => ({
  user: one(users, {
    fields: [userSkills.userId],
    references: [users.id],
  }),
  skill: one(skills, {
    fields: [userSkills.skillId],
    references: [skills.id],
  }),
}));

export const connectionsRelations = relations(connections, ({ one }) => ({
  requester: one(users, {
    fields: [connections.requesterId],
    references: [users.id],
    relationName: "requester",
  }),
  addressee: one(users, {
    fields: [connections.addresseeId],
    references: [users.id],
    relationName: "addressee",
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  likes: many(postLikes),
  comments: many(comments),
}));

export const postLikesRelations = relations(postLikes, ({ one }) => ({
  user: one(users, {
    fields: [postLikes.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [postLikes.postId],
    references: [posts.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));

export const opportunitiesRelations = relations(opportunities, ({ one }) => ({
  owner: one(users, {
    fields: [opportunities.ownerId],
    references: [users.id],
    relationName: "ownedOpportunities",
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
    relationName: "receivedNotifications",
  }),
  sender: one(users, {
    fields: [notifications.senderId],
    references: [users.id],
    relationName: "sentNotifications",
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sentMessages",
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: "receivedMessages",
  }),
}));

export const storiesRelations = relations(stories, ({ one }) => ({
  user: one(users, {
    fields: [stories.userId],
    references: [users.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
    relationName: "ownedProjects",
  }),
  members: many(projectMembers),
  joinRequests: many(projectJoinRequests),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id],
  }),
}));

export const projectJoinRequestsRelations = relations(
  projectJoinRequests,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectJoinRequests.projectId],
      references: [projects.id],
    }),
    user: one(users, {
      fields: [projectJoinRequests.userId],
      references: [users.id],
    }),
  })
);
