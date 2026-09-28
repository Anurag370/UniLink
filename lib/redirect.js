const FALLBACK = "/";

export function safeNextPath(candidate, fallback = FALLBACK) {
  if (typeof candidate !== "string" || candidate === "") {
    return fallback;
  }

  if (!candidate.startsWith("/")) {
    return fallback;
  }

  if (candidate.startsWith("//") || candidate.startsWith("/\\")) {
    return fallback;
  }

  return candidate;
}

export function readNextParam() {
  if (typeof window === "undefined") {
    return FALLBACK;
  }

  try {
    const value = new URLSearchParams(window.location.search).get("next");
    return safeNextPath(value);
  } catch {
    return FALLBACK;
  }
}
