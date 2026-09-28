import { spawn, spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { inArray, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import * as schema from "@/db/schema";
import { generateRunId } from "./helpers";

const root = fileURLToPath(new URL("../../", import.meta.url));
const tmpDir = path.join(root, "tests", ".tmp");
const logFile = path.join(tmpDir, "next.log");
const metaFile = path.join(tmpDir, "api-run.json");

const TEST_EMAIL_DOMAIN = "api-test.local";
const POSTGRES_SCHEMES = ["postgres://", "postgresql://"];
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1", "[::1]"];
const BOOT_TIMEOUT_MS = 120000;
const DEFAULT_PORT = 3141;

function loadDotEnv(file) {
  if (!existsSync(file)) {
    return;
  }
  for (const rawLine of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const eq = line.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function portFree(port) {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once("error", () => resolve(false));
    srv.listen(port, "127.0.0.1", () => srv.close(() => resolve(true)));
  });
}

async function findFreePort(start) {
  for (let port = start; port < start + 50; port++) {
    if (await portFree(port)) {
      return port;
    }
  }
  throw new Error("Could not find a free port for the API test server.");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logTail() {
  return existsSync(logFile) ? readFileSync(logFile, "utf8").slice(-4000) : "(no log file)";
}

async function waitForServer(baseUrl, child) {
  const start = Date.now();
  while (Date.now() - start < BOOT_TIMEOUT_MS) {
    if (child.exitCode !== null) {
      throw new Error(`next dev exited early (code ${child.exitCode}).\n${logTail()}`);
    }
    try {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        signal: AbortSignal.timeout(3000),
      });
      const json = await res.json().catch(() => null);
      if (res.status === 401 && json && json.success === false) {
        return;
      }
    } catch {
    }
    await sleep(400);
  }
  throw new Error(`API server did not become ready in ${BOOT_TIMEOUT_MS}ms.\n${logTail()}`);
}

function killTree(pid) {
  if (process.platform === "win32") {
    try {
      spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
    } catch {
    }
  } else {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
    }
  }
}

async function cleanup({ url, runId }) {
  const pool = new Pool({ connectionString: url, max: 1 });
  const db = drizzle(pool, { schema });
  try {
    const emailPattern = `%${runId}%@${TEST_EMAIL_DOMAIN}`;
    const testUsers = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(like(schema.users.email, emailPattern));

    const ids = testUsers.map((row) => row.id);
    if (ids.length > 0) {
      const ownedProjects = await db
        .select({ id: schema.projects.id })
        .from(schema.projects)
        .where(inArray(schema.projects.ownerId, ids));

      const ownedProjectIds = ownedProjects.map((row) => row.id);

      await db
        .delete(schema.projectJoinRequests)
        .where(
          or(
            inArray(schema.projectJoinRequests.userId, ids),
            inArray(schema.projectJoinRequests.projectId, ownedProjectIds)
          )
        );
      await db
        .delete(schema.projectMembers)
        .where(
          or(
            inArray(schema.projectMembers.userId, ids),
            inArray(schema.projectMembers.projectId, ownedProjectIds)
          )
        );
      await db.delete(schema.messages).where(
        or(
          inArray(schema.messages.senderId, ids),
          inArray(schema.messages.receiverId, ids)
        )
      );
      await db.delete(schema.notifications).where(
        or(
          inArray(schema.notifications.userId, ids),
          inArray(schema.notifications.senderId, ids)
        )
      );
      await db.delete(schema.postLikes).where(inArray(schema.postLikes.userId, ids));
      await db.delete(schema.comments).where(inArray(schema.comments.userId, ids));
      await db.delete(schema.stories).where(inArray(schema.stories.userId, ids));
      await db
        .delete(schema.opportunities)
        .where(inArray(schema.opportunities.ownerId, ids));
      await db.delete(schema.posts).where(inArray(schema.posts.userId, ids));
      await db
        .delete(schema.connections)
        .where(
          or(
            inArray(schema.connections.requesterId, ids),
            inArray(schema.connections.addresseeId, ids)
          )
        );
      await db.delete(schema.projects).where(inArray(schema.projects.ownerId, ids));
      await db.delete(schema.profiles).where(inArray(schema.profiles.userId, ids));
      await db.delete(schema.userSkills).where(inArray(schema.userSkills.userId, ids));
    }

    await db.delete(schema.skills).where(like(schema.skills.name, `TA-${runId}-%`));
    await db.delete(schema.users).where(like(schema.users.email, emailPattern));

    const remaining = await db
      .select({ n: sql`count(*)::int` })
      .from(schema.users)
      .where(like(schema.users.email, emailPattern));
    if (Number(remaining[0]?.n ?? 0) !== 0) {
      console.error(`cleanup: ${remaining[0]?.n} test user(s) still present`);
    }
  } finally {
    await pool.end();
  }
}

export default async function setup() {
  mkdirSync(tmpDir, { recursive: true });
  writeFileSync(logFile, "");

  loadDotEnv(path.join(root, ".env"));

  const url = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

  if (process.env.API_TEST_ALLOW_LIVE !== "1") {
    throw new Error(
      "API e2e tests are destructive and need an explicit opt-in. Set API_TEST_ALLOW_LIVE=1, e.g.:\n" +
        '  $env:API_TEST_ALLOW_LIVE="1"; npm run test:api'
    );
  }
  if (!url || !POSTGRES_SCHEMES.some((scheme) => url.startsWith(scheme))) {
    throw new Error(
      `DATABASE_URL must be a postgres:// or postgresql:// connection string to run API e2e tests (got "${url || "unset"}").`
    );
  }
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET must be present in .env.");
  }

  const isLocal = LOCAL_HOSTS.includes(new URL(url).hostname);
  if (!isLocal || process.env.API_TEST_ALLOW_LOCAL !== "1") {
    console.error(
      [
        "============================================================",
        "  API e2e tests running against the LIVE database:",
        `    ${url.replace(/\/\/([^:]+):[^@]+@/, "//$1:***@")}`,
        "  Records created will be removed during teardown.",
        "============================================================",
      ].join("\n")
    );
  }

  const runId = generateRunId();
  const schemaPool = new Pool({ connectionString: url, max: 1 });
  try {
    const schemaDb = drizzle(schemaPool, { schema });
    const check = await schemaDb.execute(
      sql`select count(*)::int as n from information_schema.tables where table_schema = 'public' and table_name = 'users'`
    );
    if (Number(check.rows[0]?.n ?? 0) === 0) {
      console.error("Empty database detected - applying schema from db/migrations ...");
      await migrate(schemaDb, { migrationsFolder: path.join(root, "db", "migrations") });
    }
  } finally {
    await schemaPool.end();
  }

  const preferred =
    typeof process.env.API_TEST_PORT === "string"
      ? Number(process.env.API_TEST_PORT) || DEFAULT_PORT
      : DEFAULT_PORT;
  const port = await findFreePort(preferred);
  const baseUrl = `http://127.0.0.1:${port}`;

  const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
  const child = spawn(
    process.execPath,
    [nextBin, "dev", "-H", "127.0.0.1", "-p", String(port)],
    {
      cwd: root,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
  child.stdout.on("data", (chunk) => appendFileSync(logFile, chunk));
  child.stderr.on("data", (chunk) => appendFileSync(logFile, chunk));
  child.on("exit", (code) => {
    console.error(`next dev exited with code ${code}`);
  });

  await waitForServer(baseUrl, child);

  const meta = { baseUrl, runId, port, url };
  writeFileSync(metaFile, JSON.stringify(meta));

  return async function teardown() {
    if (child.exitCode === null) {
      await new Promise((resolve) => {
        const timer = setTimeout(() => {
          try {
            killTree(child.pid);
          } catch {
          }
          resolve();
        }, 6000);
        child.once("exit", () => {
          clearTimeout(timer);
          resolve();
        });
        killTree(child.pid);
      });
    }
    try {
      await cleanup(meta);
    } finally {
      rmSync(metaFile, { force: true });
    }
  };
}