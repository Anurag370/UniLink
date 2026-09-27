import { cookies } from "next/headers";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ApiError } from "./api-error";
import { verifyAccessToken } from "./jwt";

export const AUTH_COOKIE = "token";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function authCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}

export async function getSession() {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!token) {
    return null;
  }
  try {
    const payload = await verifyAccessToken(token);
    return typeof payload.userId === "number" ? { userId: payload.userId } : null;
  } catch {
    return null;
  }
}

// How often the presence heartbeat may write to the database. Every
// authenticated request passes through requireUser(), so the update is
// throttled in the WHERE clause instead of being written on each call.
const HEARTBEAT_THROTTLE_MS = 60 * 1000;

export async function requireUser() {
  const session = await getSession();
  if (!session) {
    throw new ApiError(401, "Authentication required", "UNAUTHENTICATED");
  }

  // Presence heartbeat for the online/offline state shown in messaging.
  // Best-effort: a failed write must never fail the actual request.
  try {
    const now = Date.now();
    await db.execute(sql`
      update users
      set last_active_at = ${now}
      where id = ${session.userId}
        and (last_active_at is null or last_active_at < ${now - HEARTBEAT_THROTTLE_MS})
    `);
  } catch {
    // Ignore; the user simply stays at their previous presence timestamp.
  }

  return session;
}