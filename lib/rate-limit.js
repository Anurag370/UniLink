const buckets = new Map();

const DEFAULT_OPTIONS = { windowMs: 15 * 60 * 1000, max: 10 };

const MAX_BUCKETS = 10_000;

const IPV4_PATTERN = /^(\d{1,3}\.){3}\d{1,3}$/;

function looksLikeIp(value) {
  if (value.includes(":")) {
    return true;
  }
  return (
    IPV4_PATTERN.test(value) &&
    value
      .split(".")
      .every((part) => part.length <= 3 && Number(part) <= 255)
  );
}

function clientKey(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (looksLikeIp(first)) {
      return first;
    }
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp && looksLikeIp(realIp.trim())) {
    return realIp.trim();
  }
  return "unknown";
}

function evictExpired(now) {
  if (buckets.size <= MAX_BUCKETS) {
    return;
  }
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
  while (buckets.size > MAX_BUCKETS) {
    const oldest = buckets.keys().next();
    if (oldest.done) {
      break;
    }
    buckets.delete(oldest.value);
  }
}

export function rateLimit(request, options = {}) {
  const { windowMs, max } = { ...DEFAULT_OPTIONS, ...options };
  const key = clientKey(request);
  const now = Date.now();

  evictExpired(now);

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 1, resetAt: now + windowMs };
    buckets.set(key, bucket);
    return null;
  }

  bucket.count += 1;
  if (bucket.count > max) {
    return { retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return null;
}