import { NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/jwt";
import { safeNextPath } from "@/lib/redirect";

const AUTH_COOKIE = "token";

const AUTH_PAGES = new Set(["/login", "/register"]);

const PUBLIC_PATHS = new Set(["/", ...AUTH_PAGES]);

async function isSignedIn(request) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;

  if (!token) {
    return false;
  }

  try {
    const payload = await verifyAccessToken(token);
    return typeof payload.userId === "number";
  } catch {
    return false;
  }
}

export async function proxy(request) {
  const { pathname, search } = request.nextUrl;
  const signedIn = await isSignedIn(request);

  if (AUTH_PAGES.has(pathname)) {
    return signedIn
      ? NextResponse.redirect(new URL("/", request.url))
      : NextResponse.next();
  }

  if (!signedIn && !PUBLIC_PATHS.has(pathname)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", safeNextPath(`${pathname}${search}`));

    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpe?g|gif|webp|ico|woff2?|ttf|css|js|map|txt|xml|webmanifest)$).*)",
  ],
};
