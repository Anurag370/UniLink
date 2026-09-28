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

const HEARTBEAT_THROTTLE_MS = 60 * 1000;

export async function requireUser() {
  const session = await getSession();
  if (!session) {
    throw new ApiError(401, "Authentication required", "UNAUTHENTICATED");
  }

  try {
    const now = Date.now();
    await db.execute(sql`
      update users
      set last_active_at = ${now}
      where id = ${session.userId}
        and (last_active_at is null or last_active_at < ${now - HEARTBEAT_THROTTLE_MS})
    `);
  } catch {
  }

  return session;
}