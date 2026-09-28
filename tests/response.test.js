import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-error";
import { handleApiError } from "@/lib/response";

function pgError(code, message, constraint) {
  const err = new Error(message);
  err.code = code;
  err.name = "error";
  if (constraint) {
    err.constraint = constraint;
  }
  return err;
}

describe("handleApiError", () => {
  it("passes through ApiError", async () => {
    const res = handleApiError(new ApiError(403, "nope", "FORBIDDEN"));
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("FORBIDDEN");
  });

  it("maps unique constraint violations to 409 CONFLICT", async () => {
    const err = pgError(
      "23505",
      'duplicate key value violates unique constraint "users_email_unique"',
      "users_email_unique"
    );
    const res = handleApiError(err);
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("CONFLICT");
  });

  it("maps foreign key violations to 404 NOT_FOUND instead of 409", async () => {
    const err = pgError(
      "23503",
      'insert or update on table "posts" violates foreign key constraint "posts_user_id_users_id_fk"',
      "posts_user_id_users_id_fk"
    );
    const res = handleApiError(err);
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });

  it("does not treat other pg error codes as conflicts", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      for (const code of [
        "23502",
        "23514",
        "22P02",
        "22003",
        "42P01",
      ]) {
        const res = handleApiError(pgError(code, "some failure"));
        expect(res.status).toBe(500);
        expect((await res.json()).error.code).toBe("INTERNAL_SERVER_ERROR");
      }
    } finally {
      spy.mockRestore();
    }
  });

  it("classifies a violation nested in a wrapped error (drizzle-style)", async () => {
    const outer = new Error(
      'Failed query: insert into "connections" ("requester_id","addressee_id") params: 1,999999999'
    );
    outer.cause = pgError(
      "23503",
      'insert or update on table "connections" violates foreign key constraint "connections_addressee_id_users_id_fk"',
      "connections_addressee_id_users_id_fk"
    );
    const res = handleApiError(outer);
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });

  it("survives a cyclic cause chain", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const a = new Error("a");
      const b = new Error("b");
      a.cause = b;
      b.cause = a;
      const res = handleApiError(a);
      expect(res.status).toBe(500);
    } finally {
      spy.mockRestore();
    }
  });
});
