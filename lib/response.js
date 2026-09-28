import { ApiError } from "./api-error";

const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";

export function ok(data, status = 200) {
  return Response.json({ success: true, data }, { status });
}

export function fail(status, message, code = "ERROR", details) {
  return Response.json(
    { success: false, error: { message, code, ...(details ? { details } : {}) } },
    { status }
  );
}

function errorCodes(err) {
  const codes = [];
  let current = err;
  const seen = new Set();
  while (current && !seen.has(current)) {
    seen.add(current);
    if (typeof current.code === "string") {
      codes.push(current.code);
    }
    current = current.cause;
  }
  return codes;
}

function classifyConstraint(err) {
  const codes = errorCodes(err);
  if (codes.includes(UNIQUE_VIOLATION)) {
    return { status: 409, message: "A record with this value already exists", code: "CONFLICT" };
  }
  if (codes.includes(FOREIGN_KEY_VIOLATION)) {
    return { status: 404, message: "Referenced record not found", code: "NOT_FOUND" };
  }
  return null;
}

export function handleApiError(err) {
  if (err instanceof ApiError) {
    return fail(err.status, err.message, err.code, err.details);
  }
  const constraint = classifyConstraint(err);
  if (constraint) {
    return fail(constraint.status, constraint.message, constraint.code);
  }
  console.error(err);
  return fail(500, "Something went wrong", "INTERNAL_SERVER_ERROR");
}
