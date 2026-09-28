import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";
import { cookieValue, expectErr, expectOk, makeApiClient } from "./helpers";

const root = path.join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

const PASS = "testpass123";
const IP = {
  alice: "10.0.0.10",
  bob: "10.0.0.11",
  carol: "10.0.0.12",
  edge: "10.1.0.7",
  flood: "203.0.113.99",
};

const state = {
  runId: "",
  req: null,
  alice: {},
  bob: {},
  carol: {},
  login: {},
};

function emailFor(name) {
  return `${name}.${state.runId}@api-test.local`;
}
function skillName(name) {
  return `TA-${state.runId}-${name}`;
}

beforeAll(async () => {
  const meta = JSON.parse(
    readFileSync(path.join(root, "tests", ".tmp", "api-run.json"), "utf8")
  );
  state.runId = meta.runId;
  state.req = makeApiClient(meta.baseUrl);

  for (const name of ["alice", "bob", "carol"]) {
    const res = await state.req("POST", "/api/auth/register", {
      ip: IP[name],
      body: { fullName: name[0].toUpperCase() + name.slice(1), email: emailFor(name), password: PASS },
    });
    const data = expectOk(res, 201);
    state[name].id = data.user.id;
    state[name].email = data.user.email;
    state[name].token = cookieValue(res);
  }
});

describe("auth", () => {
  test("POST /api/auth/login returns a session cookie", async () => {
    const res = await state.req("POST", "/api/auth/login", {
      ip: IP.alice,
      body: { email: emailFor("alice"), password: PASS },
    });
    const data = expectOk(res);
    expect(data.user.email).toBe(emailFor("alice"));
    state.login.token = cookieValue(res);
  });

  test("GET /api/auth/me returns the authenticated user with email", async () => {
    const res = await state.req("GET", "/api/auth/me", { token: state.login.token });
    const data = expectOk(res);
    expect(data.user.email).toBe(emailFor("alice"));
  });

  test("GET /api/auth/me without a cookie returns 401", async () => {
    expectErr(await state.req("GET", "/api/auth/me"), 401, "UNAUTHENTICATED");
  });

  test("POST /api/auth/login with a wrong password returns 401", async () => {
    expectErr(
      await state.req("POST", "/api/auth/login", {
        ip: IP.edge,
        body: { email: emailFor("alice"), password: "wrong-password" },
      }),
      401,
      "INVALID_CREDENTIALS"
    );
  });

  test("POST /api/auth/logout clears the token cookie", async () => {
    const res = await state.req("POST", "/api/auth/logout", { token: state.login.token });
    const data = expectOk(res);
    expect(data.loggedOut).toBe(true);
    expect(cookieValue(res)).toBe("");
  });

  test("register with a duplicate email returns 409 EMAIL_TAKEN", async () => {
    expectErr(
      await state.req("POST", "/api/auth/register", {
        ip: IP.edge,
        body: { fullName: "Dup", email: emailFor("alice"), password: PASS },
      }),
      409,
      "EMAIL_TAKEN"
    );
  });

  test("register with a short password returns 422", async () => {
    const err = expectErr(
      await state.req("POST", "/api/auth/register", {
        ip: IP.edge,
        body: { fullName: "Short", email: emailFor("short"), password: "short" },
      }),
      422,
      "VALIDATION_ERROR"
    );
    expect(err.details.some((d) => d.message.includes("at least 8"))).toBe(true);
  });

  test("register rejects a password over 72 bytes (M1 regression)", async () => {
    const err = expectErr(
      await state.req("POST", "/api/auth/register", {
        ip: IP.edge,
        body: { fullName: "Big", email: emailFor("big"), password: "x".repeat(73) },
      }),
      422,
      "VALIDATION_ERROR"
    );
    expect(err.details.some((d) => d.message.includes("72 bytes"))).toBe(true);
  });

  test("register with an unknown key returns 422", async () => {
    expectErr(
      await state.req("POST", "/api/auth/register", {
        ip: IP.edge,
        body: { fullName: "Sneaky", email: emailFor("sneaky"), password: PASS, role: "admin" },
      }),
      422,
      "VALIDATION_ERROR"
    );
  });

  test("register with malformed JSON returns 400 INVALID_JSON", async () => {
    const res = await fetch(baseUrl() + "/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": IP.edge },
      body: "{not-json",
    });
    const json = await res.json().catch(() => null);
    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("INVALID_JSON");
  });

  test("auth endpoints are rate limited (429 after 10 attempts)", async () => {
    for (let i = 0; i < 10; i++) {
      expectOk(
        await state.req("POST", "/api/auth/register", {
          ip: IP.flood,
          body: { fullName: `Flood ${i}`, email: `flood-${i}.${state.runId}@api-test.local`, password: PASS },
        }),
        201
      );
    }
    const limited = await state.req("POST", "/api/auth/register", {
      ip: IP.flood,
      body: { fullName: "Flood 11", email: `flood-11.${state.runId}@api-test.local`, password: PASS },
    });
    expectErr(limited, 429, "RATE_LIMITED");
    expect(limited.headers.get("retry-after")).toBeTruthy();
  });
});

describe("users", () => {
  test("GET /api/users lists users", async () => {
    const data = expectOk(
      await state.req("GET", "/api/users?limit=50", { token: state.alice.token })
    );
    expect(Array.isArray(data.users)).toBe(true);
    expect(data.total).toBeGreaterThanOrEqual(3);
    expect(data.users.some((u) => u.fullName === "Alice")).toBe(true);
  });

  test("GET /api/users?query= filters by full name", async () => {
    const data = expectOk(
      await state.req("GET", "/api/users?query=Bob", { token: state.alice.token })
    );
    expect(data.users.every((u) => u.fullName === "Bob")).toBe(true);
  });

  test("GET /api/users?query= is case-insensitive (Postgres ILIKE regression)", async () => {
    for (const query of ["bob", "BOB", "bOb"]) {
      const data = expectOk(
        await state.req("GET", `/api/users?query=${query}`, {
          token: state.alice.token,
        })
      );
      expect(
        data.users.some((u) => u.fullName === "Bob"),
        `query=${query} should match "Bob"`
      ).toBe(true);
    }
  });

  test("GET /api/users?query=%% matches literally (L2 regression)", async () => {
    const data = expectOk(
      await state.req(`GET`, `/api/users?query=${encodeURIComponent("%")}`, {
        token: state.alice.token,
      })
    );
    expect(data.users).toEqual([]);
  });

  test("GET /api/users supports pagination", async () => {
    const data = expectOk(
      await state.req("GET", "/api/users?page=2&limit=2", { token: state.alice.token })
    );
    expect(data.page).toBe(2);
    expect(data.limit).toBe(2);
    expect(data.users.length).toBeLessThanOrEqual(2);
  });

  test("GET /api/users without auth returns 401", async () => {
    expectErr(await state.req("GET", "/api/users"), 401, "UNAUTHENTICATED");
  });

  test("GET /api/users with an invalid query returns 422", async () => {
    expectErr(await state.req("GET", "/api/users?page=0", { token: state.alice.token }), 422, "VALIDATION_ERROR");
  });

  test("GET /api/users/me returns email", async () => {
    const data = expectOk(await state.req("GET", "/api/users/me", { token: state.alice.token }));
    expect(data.user.email).toBe(emailFor("alice"));
  });

  test("PATCH /api/users/me replaces skills and dedupes them", async () => {
    const data = expectOk(
      await state.req("PATCH", "/api/users/me", {
        token: state.alice.token,
        body: { skills: [skillName("node"), skillName("node"), skillName("react")] },
      })
    );
    expect(data.user.skills.map((s) => s.name)).toEqual([skillName("node"), skillName("react")]);
  });

  test("PATCH /api/users/me with skills:null clears skills (L1 regression)", async () => {
    const data = expectOk(
      await state.req("PATCH", "/api/users/me", {
        token: state.alice.token,
        body: { skills: null },
      })
    );
    expect(data.user.skills).toEqual([]);
  });

  test("PATCH /api/users/me updates profile fields", async () => {
    const data = expectOk(
      await state.req("PATCH", "/api/users/me", {
        token: state.alice.token,
        body: { bio: "Hello", department: "CS", year: "2026" },
      })
    );
    expect(data.user.profile).toEqual({ bio: "Hello", department: "CS", year: "2026" });
  });

  test("PATCH /api/users/me with oversize bio returns 422", async () => {
    expectErr(
      await state.req("PATCH", "/api/users/me", {
        token: state.alice.token,
        body: { bio: "x".repeat(1001) },
      }),
      422,
      "VALIDATION_ERROR"
    );
  });

  test("GET /api/users/:id reports isMe correctly", async () => {
    const self = expectOk(
      await state.req("GET", `/api/users/${state.alice.id}`, { token: state.alice.token })
    );
    expect(self.isMe).toBe(true);
    expect(self.user.fullName).toBe("Alice");

    const other = expectOk(
      await state.req("GET", `/api/users/${state.alice.id}`, { token: state.bob.token })
    );
    expect(other.isMe).toBe(false);
  });

  test("GET /api/users/:id with unknown id returns 404", async () => {
    expectErr(
      await state.req("GET", "/api/users/999999999", { token: state.alice.token }),
      404,
      "NOT_FOUND"
    );
  });

  test("GET /api/users/:id with a non-numeric id returns 422", async () => {
    expectErr(
      await state.req("GET", "/api/users/abc", { token: state.alice.token }),
      422,
      "VALIDATION_ERROR"
    );
  });
});

describe("connections", () => {
  let connAB;
  let connAC;

  test("POST /api/connections sends a pending request", async () => {
    const data = expectOk(
      await state.req("POST", "/api/connections", {
        token: state.alice.token,
        body: { userId: state.bob.id },
      }),
      201
    );
    connAB = data.connection;
    expect(connAB.requesterId).toBe(state.alice.id);
    expect(connAB.addresseeId).toBe(state.bob.id);
    expect(connAB.status).toBe("pending");
  });

  test("POST /api/connections to yourself returns 400", async () => {
    expectErr(
      await state.req("POST", "/api/connections", {
        token: state.alice.token,
        body: { userId: state.alice.id },
      }),
      400,
      "SELF_CONNECTION"
    );
  });

  test("duplicate request in the same direction returns 409", async () => {
    expectErr(
      await state.req("POST", "/api/connections", {
        token: state.alice.token,
        body: { userId: state.bob.id },
      }),
      409,
      "DUPLICATE_REQUEST"
    );
  });

  test("reverse pending request returns 409 REQUEST_DUPLICATE", async () => {
    expectErr(
      await state.req("POST", "/api/connections", {
        token: state.bob.token,
        body: { userId: state.alice.id },
      }),
      409,
      "REQUEST_DUPLICATE"
    );
  });

  test("request to a nonexistent user returns 404 (FK regression)", async () => {
    expectErr(
      await state.req("POST", "/api/connections", {
        token: state.alice.token,
        body: { userId: 999999999 },
      }),
      404,
      "NOT_FOUND"
    );
  });

  test("GET /api/connections lists outgoing requests", async () => {
    const data = expectOk(
      await state.req("GET", "/api/connections?status=outgoing", { token: state.alice.token })
    );
    expect(data.total).toBe(1);
    expect(data.connections[0].id).toBe(connAB.id);
  });

  test("GET /api/connections lists incoming requests with peer user", async () => {
    const data = expectOk(
      await state.req("GET", "/api/connections?status=incoming", { token: state.bob.token })
    );
    expect(data.total).toBe(1);
    expect(data.connections[0].user.fullName).toBe("Alice");
  });

  test("GET /api/connections lists no connected users yet", async () => {
    const data = expectOk(
      await state.req("GET", "/api/connections?status=connected", { token: state.alice.token })
    );
    expect(data.total).toBe(0);
  });

  test("PATCH accept by the addressee connects the pair", async () => {
    const data = expectOk(
      await state.req("PATCH", `/api/connections/${connAB.id}`, {
        token: state.bob.token,
        body: { action: "accept" },
      })
    );
    expect(data.connection.status).toBe("accepted");
  });

  test("PATCH accept by the requester returns 403", async () => {
    expectErr(
      await state.req("PATCH", `/api/connections/${connAB.id}`, {
        token: state.alice.token,
        body: { action: "accept" },
      }),
      403,
      "FORBIDDEN"
    );
  });

  test("PATCH accept again returns 400 NOT_PENDING", async () => {
    expectErr(
      await state.req("PATCH", `/api/connections/${connAB.id}`, {
        token: state.bob.token,
        body: { action: "accept" },
      }),
      400,
      "NOT_PENDING"
    );
  });

  test("accepted pair now shows as connected", async () => {
    const data = expectOk(
      await state.req("GET", "/api/connections?status=connected", { token: state.alice.token })
    );
    expect(data.total).toBe(1);
    expect(data.connections[0].user.fullName).toBe("Bob");
  });

  test("reject then re-request re-activates a pending request", async () => {
    const sent = expectOk(
      await state.req("POST", "/api/connections", {
        token: state.alice.token,
        body: { userId: state.carol.id },
      }),
      201
    );
    connAC = sent.connection;

    const rejected = expectOk(
      await state.req("PATCH", `/api/connections/${connAC.id}`, {
        token: state.carol.token,
        body: { action: "reject" },
      })
    );
    expect(rejected.connection.status).toBe("rejected");

    const resent = expectOk(
      await state.req("POST", "/api/connections", {
        token: state.alice.token,
        body: { userId: state.carol.id },
      }),
      201
    );
    expect(resent.connection.id).toBe(connAC.id);
    expect(resent.connection.status).toBe("pending");
  });

  test("DELETE removes the connection", async () => {
    expectOk(
      await state.req("DELETE", `/api/connections/${connAC.id}`, { token: state.alice.token })
    );
  });

  test("DELETE on a removed connection returns 404", async () => {
    expectErr(
      await state.req("DELETE", `/api/connections/${connAC.id}`, { token: state.alice.token }),
      404,
      "NOT_FOUND"
    );
  });

  test("DELETE by a stranger returns 403", async () => {
    expectErr(
      await state.req("DELETE", `/api/connections/${connAB.id}`, { token: state.carol.token }),
      403,
      "FORBIDDEN"
    );
  });

  test("GET /api/connections without auth returns 401", async () => {
    expectErr(await state.req("GET", "/api/connections"), 401, "UNAUTHENTICATED");
  });

  test("GET /api/connections with an invalid status returns 422", async () => {
    expectErr(
      await state.req("GET", "/api/connections?status=banana", { token: state.alice.token }),
      422,
      "VALIDATION_ERROR"
    );
  });

  test("PATCH with a nonexistent id returns 404", async () => {
    expectErr(
      await state.req("PATCH", "/api/connections/999999999", {
        token: state.bob.token,
        body: { action: "accept" },
      }),
      404,
      "NOT_FOUND"
    );
  });

  test("PATCH with a non-numeric id returns 422", async () => {
    expectErr(
      await state.req("PATCH", "/api/connections/abc", {
        token: state.bob.token,
        body: { action: "accept" },
      }),
      422,
      "VALIDATION_ERROR"
    );
  });

  test("PATCH with an invalid action returns 422", async () => {
    expectErr(
      await state.req("PATCH", `/api/connections/${connAB.id}`, {
        token: state.bob.token,
        body: { action: "maybe" },
      }),
      422,
      "VALIDATION_ERROR"
    );
  });
});

describe("posts", () => {
  let postId;

  test("POST /api/posts creates a post", async () => {
    const data = expectOk(
      await state.req("POST", "/api/posts", {
        token: state.alice.token,
        body: { content: "Hello UniLink" },
      }),
      201
    );
    postId = data.post.id;
    expect(data.post.author.fullName).toBe("Alice");
    expect(data.post.content).toBe("Hello UniLink");
  });

  test("POST /api/posts with empty content returns 422", async () => {
    expectErr(
      await state.req("POST", "/api/posts", { token: state.alice.token, body: { content: "   " } }),
      422,
      "VALIDATION_ERROR"
    );
  });

  test("GET /api/posts lists posts with author", async () => {
    const data = expectOk(await state.req("GET", "/api/posts", { token: state.alice.token }));
    expect(data.total).toBeGreaterThanOrEqual(1);
    expect(data.posts[0].author.fullName).toBe("Alice");
  });

  test("GET /api/posts/:id returns the post", async () => {
    const data = expectOk(
      await state.req("GET", `/api/posts/${postId}`, { token: state.bob.token })
    );
    expect(data.post.content).toBe("Hello UniLink");
  });

  test("GET /api/posts/:id with an unknown id returns 404", async () => {
    expectErr(
      await state.req("GET", "/api/posts/999999999", { token: state.alice.token }),
      404,
      "NOT_FOUND"
    );
  });

  test("PATCH /api/posts/:id by a non-owner returns 403", async () => {
    expectErr(
      await state.req("PATCH", `/api/posts/${postId}`, {
        token: state.bob.token,
        body: { content: "hijacked" },
      }),
      403,
      "FORBIDDEN"
    );
  });

  test("PATCH /api/posts/:id by the owner updates content", async () => {
    const data = expectOk(
      await state.req("PATCH", `/api/posts/${postId}`, {
        token: state.alice.token,
        body: { content: "Edited content" },
      })
    );
    expect(data.post.content).toBe("Edited content");
  });

  test("DELETE /api/posts/:id by a non-owner returns 403", async () => {
    expectErr(
      await state.req("DELETE", `/api/posts/${postId}`, { token: state.bob.token }),
      403,
      "FORBIDDEN"
    );
  });

  test("DELETE /api/posts/:id by the owner deletes it", async () => {
    expectOk(await state.req("DELETE", `/api/posts/${postId}`, { token: state.alice.token }));
    expectErr(
      await state.req("GET", `/api/posts/${postId}`, { token: state.alice.token }),
      404,
      "NOT_FOUND"
    );
  });

  test("POST /api/posts with an unknown key returns 422", async () => {
    expectErr(
      await state.req("POST", "/api/posts", {
        token: state.alice.token,
        body: { content: "Fine", tags: ["x"] },
      }),
      422,
      "VALIDATION_ERROR"
    );
  });
});

describe("projects", () => {
  let projectId;
  let joinReqId;

  test("POST /api/projects creates a project with the owner as member", async () => {
    const data = expectOk(
      await state.req("POST", "/api/projects", {
        token: state.alice.token,
        body: { name: "UniLink Mobile", description: "A mobile app" },
      }),
      201
    );
    projectId = data.project.id;
    expect(data.project.memberCount).toBe(1);
    expect(data.project.members[0].role).toBe("owner");
    expect(data.project.owner.fullName).toBe("Alice");
    expect("joinRequests" in data.project).toBe(false);
  });

  test("POST /api/projects with an empty name returns 422", async () => {
    expectErr(
      await state.req("POST", "/api/projects", {
        token: state.alice.token,
        body: { name: "   " },
      }),
      422,
      "VALIDATION_ERROR"
    );
  });

  test("GET /api/projects lists projects", async () => {
    const data = expectOk(await state.req("GET", "/api/projects", { token: state.alice.token }));
    expect(data.total).toBeGreaterThanOrEqual(1);
    expect(data.projects.some((p) => p.id === projectId)).toBe(true);
  });

  test("GET /api/projects/:id by a non-owner omits joinRequests (H1 regression)", async () => {
    const data = expectOk(
      await state.req("GET", `/api/projects/${projectId}`, { token: state.bob.token })
    );
    expect(data.project.memberCount).toBeGreaterThanOrEqual(1);
    expect("joinRequests" in data.project).toBe(false);
  });

  test("GET /api/projects/:id by the owner also omits joinRequests", async () => {
    const data = expectOk(
      await state.req("GET", `/api/projects/${projectId}`, { token: state.alice.token })
    );
    expect("joinRequests" in data.project).toBe(false);
  });

  test("PATCH /api/projects/:id by a non-owner returns 403", async () => {
    expectErr(
      await state.req("PATCH", `/api/projects/${projectId}`, {
        token: state.bob.token,
        body: { name: "hijacked" },
      }),
      403,
      "FORBIDDEN"
    );
  });

  test("PATCH /api/projects/:id by the owner updates and includes pending join requests", async () => {
    const data = expectOk(
      await state.req("PATCH", `/api/projects/${projectId}`, {
        token: state.alice.token,
        body: { name: "UniLink Mobile 2.0" },
      })
    );
    expect(data.project.name).toBe("UniLink Mobile 2.0");
    expect(Array.isArray(data.project.joinRequests)).toBe(true);
    expect(data.project.joinRequests).toEqual([]);
  });

  test("POST members adds a member (owner view includes joinRequests)", async () => {
    const data = expectOk(
      await state.req("POST", `/api/projects/${projectId}/members`, {
        token: state.alice.token,
        body: { userId: state.carol.id },
      })
    );
    expect(data.project.memberCount).toBe(2);
    expect(Array.isArray(data.project.joinRequests)).toBe(true);
  });

  test("owner cannot be added again via members endpoint", async () => {
    expectErr(
      await state.req("POST", `/api/projects/${projectId}/members`, {
        token: state.alice.token,
        body: { userId: state.alice.id },
      }),
      400,
      "ALREADY_MEMBER"
    );
  });

  test("adding an existing member returns 409", async () => {
    expectErr(
      await state.req("POST", `/api/projects/${projectId}/members`, {
        token: state.alice.token,
        body: { userId: state.carol.id },
      }),
      409,
      "ALREADY_MEMBER"
    );
  });

  test("adding a nonexistent user returns 404 (FK regression)", async () => {
    expectErr(
      await state.req("POST", `/api/projects/${projectId}/members`, {
        token: state.alice.token,
        body: { userId: 999999999 },
      }),
      404,
      "NOT_FOUND"
    );
  });

  test("adding a member by a non-owner returns 403", async () => {
    expectErr(
      await state.req("POST", `/api/projects/${projectId}/members`, {
        token: state.bob.token,
        body: { userId: state.alice.id },
      }),
      403,
      "FORBIDDEN"
    );
  });

  test("POST join-requests creates a pending request", async () => {
    const data = expectOk(
      await state.req("POST", `/api/projects/${projectId}/join-requests`, {
        token: state.bob.token,
      }),
      201
    );
    joinReqId = data.joinRequest.id;
    expect(data.joinRequest.status).toBe("pending");
  });

  test("duplicate join request returns 409", async () => {
    expectErr(
      await state.req("POST", `/api/projects/${projectId}/join-requests`, {
        token: state.bob.token,
      }),
      409,
      "DUPLICATE_REQUEST"
    );
  });

  test("owner cannot request to join their own project", async () => {
    expectErr(
      await state.req("POST", `/api/projects/${projectId}/join-requests`, {
        token: state.alice.token,
      }),
      400,
      "OWN_PROJECT"
    );
  });

  test("GET join-requests by a non-owner returns 403", async () => {
    expectErr(
      await state.req("GET", `/api/projects/${projectId}/join-requests`, {
        token: state.bob.token,
      }),
      403,
      "FORBIDDEN"
    );
  });

  test("GET join-requests by the owner lists the pending request", async () => {
    const data = expectOk(
      await state.req("GET", `/api/projects/${projectId}/join-requests`, {
        token: state.alice.token,
      })
    );
    const req = data.joinRequests.find((j) => j.id === joinReqId);
    expect(req.status).toBe("pending");
    expect(req.user.fullName).toBe("Bob");
  });

  test("reject marks the request handled and removes it from the pending view", async () => {
    const data = expectOk(
      await state.req("PATCH", `/api/projects/${projectId}/join-requests/${joinReqId}`, {
        token: state.alice.token,
        body: { action: "reject" },
      })
    );
    expect(data.project.joinRequests).toEqual([]);

    const listed = expectOk(
      await state.req("GET", `/api/projects/${projectId}/join-requests`, {
        token: state.alice.token,
      })
    );
    expect(listed.joinRequests.find((j) => j.id === joinReqId).status).toBe("rejected");
  });

  test("re-requesting after reject re-activates the pending request", async () => {
    const data = expectOk(
      await state.req("POST", `/api/projects/${projectId}/join-requests`, {
        token: state.bob.token,
      }),
      201
    );
    expect(data.joinRequest.id).toBe(joinReqId);
    expect(data.joinRequest.status).toBe("pending");
  });

  test("approve adds the requester as a member", async () => {
    const data = expectOk(
      await state.req("PATCH", `/api/projects/${projectId}/join-requests/${joinReqId}`, {
        token: state.alice.token,
        body: { action: "approve" },
      })
    );
    expect(data.project.memberCount).toBe(3);
    expect(data.project.members.some((m) => m.user.fullName === "Bob")).toBe(true);
    expect(data.project.joinRequests).toEqual([]);
  });

  test("approving the same request again returns 400", async () => {
    expectErr(
      await state.req("PATCH", `/api/projects/${projectId}/join-requests/${joinReqId}`, {
        token: state.alice.token,
        body: { action: "approve" },
      }),
      400,
      "NOT_PENDING"
    );
  });

  test("deciding a request by a non-owner returns 403", async () => {
    expectErr(
      await state.req("PATCH", `/api/projects/${projectId}/join-requests/${joinReqId}`, {
        token: state.bob.token,
        body: { action: "approve" },
      }),
      403,
      "FORBIDDEN"
    );
  });

  test("deciding a nonexistent request returns 404", async () => {
    expectErr(
      await state.req("PATCH", `/api/projects/${projectId}/join-requests/999999999`, {
        token: state.alice.token,
        body: { action: "approve" },
      }),
      404,
      "NOT_FOUND"
    );
  });

  test("deciding with an invalid action returns 422", async () => {
    expectErr(
      await state.req("PATCH", `/api/projects/${projectId}/join-requests/${joinReqId}`, {
        token: state.alice.token,
        body: { action: "maybe" },
      }),
      422,
      "VALIDATION_ERROR"
    );
  });

  test("DELETE members removes a member", async () => {
    const data = expectOk(
      await state.req("DELETE", `/api/projects/${projectId}/members/${state.carol.id}`, {
        token: state.alice.token,
      })
    );
    expect(data.project.memberCount).toBe(2);
  });

  test("owner cannot be removed", async () => {
    expectErr(
      await state.req("DELETE", `/api/projects/${projectId}/members/${state.alice.id}`, {
        token: state.alice.token,
      }),
      400,
      "CANNOT_REMOVE_OWNER"
    );
  });

  test("removing a non-member returns 404", async () => {
    expectErr(
      await state.req("DELETE", `/api/projects/${projectId}/members/${state.carol.id}`, {
        token: state.alice.token,
      }),
      404,
      "NOT_FOUND"
    );
  });

  test("removing a member by a non-owner returns 403", async () => {
    expectErr(
      await state.req("DELETE", `/api/projects/${projectId}/members/${state.alice.id}`, {
        token: state.bob.token,
      }),
      403,
      "FORBIDDEN"
    );
  });

  test("DELETE /api/projects/:id by a non-owner returns 403", async () => {
    expectErr(
      await state.req("DELETE", `/api/projects/${projectId}`, { token: state.bob.token }),
      403,
      "FORBIDDEN"
    );
  });

  test("DELETE /api/projects/:id by the owner deletes the project", async () => {
    expectOk(await state.req("DELETE", `/api/projects/${projectId}`, { token: state.alice.token }));
    expectErr(
      await state.req("GET", `/api/projects/${projectId}`, { token: state.alice.token }),
      404,
      "NOT_FOUND"
    );
  });
});

describe("notifications", () => {
  let connRequest;

  test("sending a connection request creates a notification for the addressee", async () => {
    const sent = expectOk(
      await state.req("POST", "/api/connections", {
        token: state.alice.token,
        body: { userId: state.carol.id },
      }),
      201
    );
    connRequest = sent.connection.id;
    const data = expectOk(
      await state.req("GET", "/api/notifications", { token: state.carol.token })
    );
    const note = data.notifications.find((n) => n.type === "connection");
    expect(note).toBeTruthy();
    expect(note.read).toBe(false);
    expect(note.sender.id).toBe(state.alice.id);
  });

  test("accepting a request creates a notification for the requester", async () => {
    expectOk(
      await state.req("PATCH", `/api/connections/${connRequest}`, {
        token: state.carol.token,
        body: { action: "accept" },
      })
    );
    const data = expectOk(
      await state.req("GET", "/api/notifications", { token: state.alice.token })
    );
    const note = data.notifications.find(
      (n) => n.type === "connection" && n.sender.id === state.carol.id
    );
    expect(note).toBeTruthy();
    expect(note.message).toContain("accepted");
  });

  test("PATCH marks a single notification as read", async () => {
    const list = expectOk(
      await state.req("GET", "/api/notifications", { token: state.carol.token })
    );
    const target = list.notifications.find((n) => n.type === "connection");
    const marked = expectOk(
      await state.req("PATCH", `/api/notifications/${target.id}`, {
        token: state.carol.token,
      })
    );
    expect(marked.notification.read).toBe(true);
  });

  test("POST read-all marks every notification read", async () => {
    await state.req("POST", "/api/messages", {
      token: state.bob.token,
      body: { userId: state.alice.id, text: "Hi first" },
    });
    await state.req("POST", "/api/messages", {
      token: state.carol.token,
      body: { userId: state.alice.id, text: "Hi second" },
    });
    expectOk(
      await state.req("POST", "/api/notifications/read-all", {
        token: state.alice.token,
      })
    );
    const data = expectOk(
      await state.req("GET", "/api/notifications", { token: state.alice.token })
    );
    expect(data.total).toBeGreaterThanOrEqual(2);
    expect(data.notifications.every((n) => n.read)).toBe(true);
  });

  test("DELETE removes a single notification", async () => {
    const list = expectOk(
      await state.req("GET", "/api/notifications", { token: state.alice.token })
    );
    const target = list.notifications.find((n) => n.type === "message");
    const before = list.notifications.length;
    expectOk(
      await state.req("DELETE", `/api/notifications/${target.id}`, {
        token: state.alice.token,
      })
    );
    const after = expectOk(
      await state.req("GET", "/api/notifications", { token: state.alice.token })
    );
    expect(after.notifications.length).toBe(before - 1);
    expect(after.notifications.some((n) => n.id === target.id)).toBe(false);
  });

  test("DELETE clears all notifications", async () => {
    expectOk(
      await state.req("DELETE", "/api/notifications", { token: state.alice.token })
    );
    const data = expectOk(
      await state.req("GET", "/api/notifications", { token: state.alice.token })
    );
    expect(data.total).toBe(0);
  });

  test("notifications endpoints return 401 without auth", async () => {
    expectErr(await state.req("GET", "/api/notifications"), 401, "UNAUTHENTICATED");
  });
});

describe("messages", () => {
  test("sending a message to a connected user works", async () => {
    const data = expectOk(
      await state.req("POST", "/api/messages", {
        token: state.alice.token,
        body: { userId: state.bob.id, text: "Hello Bob" },
      }),
      201
    );
    expect(data.message.text).toBe("Hello Bob");
    expect(data.message.read).toBe(false);
  });

  test("sending a message to an unconnected user returns 403", async () => {
    expectErr(
      await state.req("POST", "/api/messages", {
        token: state.bob.token,
        body: { userId: state.carol.id, text: "nope" },
      }),
      403,
      "NOT_CONNECTED"
    );
  });

  test("sending a message to yourself returns 400", async () => {
    expectErr(
      await state.req("POST", "/api/messages", {
        token: state.alice.token,
        body: { userId: state.alice.id, text: "nope" },
      }),
      400,
      "SELF_MESSAGE"
    );
  });

  test("sending to a nonexistent user returns 404", async () => {
    expectErr(
      await state.req("POST", "/api/messages", {
        token: state.alice.token,
        body: { userId: 999999999, text: "ghost" },
      }),
      404,
      "NOT_FOUND"
    );
  });

  test("GET /api/messages lists conversations with latest and unread", async () => {
    const data = expectOk(
      await state.req("GET", "/api/messages", { token: state.alice.token })
    );
    expect(data.total).toBeGreaterThanOrEqual(1);
    const conv = data.conversations.find((c) => c.user.id === state.bob.id);
    expect(conv).toBeTruthy();
    expect(conv.latestMessage.text).toBe("Hello Bob");
  });

  test("GET /api/messages/:userId returns the conversation", async () => {
    const data = expectOk(
      await state.req("GET", `/api/messages/${state.bob.id}`, {
        token: state.alice.token,
      })
    );
    expect(data.total).toBeGreaterThanOrEqual(1);
    expect(data.messages.some((m) => m.text === "Hello Bob")).toBe(true);
  });

  test("PATCH marks the conversation read", async () => {
    expectOk(
      await state.req("PATCH", `/api/messages/${state.alice.id}`, {
        token: state.bob.token,
      })
    );
    const data = expectOk(
      await state.req("GET", "/api/messages", { token: state.bob.token })
    );
    const conv = data.conversations.find((c) => c.user.id === state.alice.id);
    expect(conv.unreadCount).toBe(0);
  });
});

describe("posts: likes & comments", () => {
  let postId;

  test("creating a post with an image works", async () => {
    const data = expectOk(
      await state.req("POST", "/api/posts", {
        token: state.alice.token,
        body: { content: "Image post", image: "data:image/jpeg;base64,AAAA" },
      }),
      201
    );
    postId = data.post.id;
    expect(data.post.image).toBe("data:image/jpeg;base64,AAAA");
  });

  test("toggle like on and off with isLiked in list", async () => {
    const liked = expectOk(
      await state.req("POST", `/api/posts/${postId}/like`, { token: state.bob.token })
    );
    expect(liked.liked).toBe(true);
    expect(liked.likes).toBe(1);

    const asBob = expectOk(
      await state.req("GET", `/api/posts/${postId}`, { token: state.bob.token })
    );
    expect(asBob.post.isLiked).toBe(true);

    const unliked = expectOk(
      await state.req("POST", `/api/posts/${postId}/like`, { token: state.bob.token })
    );
    expect(unliked.liked).toBe(false);
    expect(unliked.likes).toBe(0);
  });

  test("carol likes the post", async () => {
    expectOk(
      await state.req("POST", `/api/posts/${postId}/like`, { token: state.carol.token })
    );
    const asBob = expectOk(await state.req("GET", "/api/posts", { token: state.bob.token }));
    const post = asBob.posts.find((p) => p.id === postId);
    expect(post.likes).toBe(1);
    expect(post.isLiked).toBe(false);
  });

  test("concurrent likes from different users do not lose increments", async () => {
    const created = expectOk(
      await state.req("POST", "/api/posts", {
        token: state.alice.token,
        body: { content: "Concurrency probe" },
      }),
      201
    );
    const id = created.post.id;

    const responses = await Promise.all([
      state.req("POST", `/api/posts/${id}/like`, { token: state.bob.token }),
      state.req("POST", `/api/posts/${id}/like`, { token: state.carol.token }),
    ]);
    for (const call of responses) {
      expect(call.status).toBe(200);
    }

    const data = expectOk(
      await state.req("GET", `/api/posts/${id}`, { token: state.bob.token })
    );
    expect(data.post.likes).toBe(2);
  });

  test("commenting increments the count and lists", async () => {
    const comment = expectOk(
      await state.req("POST", `/api/posts/${postId}/comments`, {
        token: state.bob.token,
        body: { content: "Great post" },
      }),
      201
    );
    expect(comment.comment.author.fullName).toBe("Bob");

    const list = expectOk(
      await state.req("GET", `/api/posts/${postId}/comments`, { token: state.bob.token })
    );
    expect(list.total).toBe(1);
    expect(list.comments[0].content).toBe("Great post");

    const post = expectOk(
      await state.req("GET", `/api/posts/${postId}`, { token: state.bob.token })
    );
    expect(post.post.comments).toBe(1);
  });

  test("commenting with empty content returns 422", async () => {
    expectErr(
      await state.req("POST", `/api/posts/${postId}/comments`, {
        token: state.bob.token,
        body: { content: "   " },
      }),
      422,
      "VALIDATION_ERROR"
    );
  });

  test("liking a nonexistent post returns 404", async () => {
    expectErr(
      await state.req("POST", "/api/posts/999999999/like", { token: state.bob.token }),
      404,
      "NOT_FOUND"
    );
  });
});

describe("opportunities", () => {
  let opportunityId;

  test("POST creates an opportunity owned by the poster", async () => {
    const data = expectOk(
      await state.req("POST", "/api/opportunities", {
        token: state.alice.token,
        body: {
          title: "Summer Hackathon",
          type: "Hackathon",
          date: "2026-07-01",
          location: "Campus",
          description: "Build something cool",
          link: "https://example.com",
        },
      }),
      201
    );
    opportunityId = data.opportunity.id;
    expect(data.opportunity.owner.fullName).toBe("Alice");
    expect(data.opportunity.date).toBe("2026-07-01");
  });

  test("GET lists opportunities", async () => {
    const data = expectOk(
      await state.req("GET", "/api/opportunities", { token: state.bob.token })
    );
    expect(data.total).toBeGreaterThanOrEqual(1);
    expect(data.opportunities.some((o) => o.id === opportunityId)).toBe(true);
  });

  test("GET by id returns the detail", async () => {
    const data = expectOk(
      await state.req("GET", `/api/opportunities/${opportunityId}`, {
        token: state.bob.token,
      })
    );
    expect(data.opportunity.title).toBe("Summer Hackathon");
  });

  test("PATCH by a non-owner returns 403", async () => {
    expectErr(
      await state.req("PATCH", `/api/opportunities/${opportunityId}`, {
        token: state.bob.token,
        body: { title: "hijacked" },
      }),
      403,
      "FORBIDDEN"
    );
  });

  test("PATCH by the owner updates", async () => {
    const data = expectOk(
      await state.req("PATCH", `/api/opportunities/${opportunityId}`, {
        token: state.alice.token,
        body: { title: "Summer Hackathon 2.0" },
      })
    );
    expect(data.opportunity.title).toBe("Summer Hackathon 2.0");
  });

  test("DELETE by the owner removes it", async () => {
    expectOk(
      await state.req("DELETE", `/api/opportunities/${opportunityId}`, {
        token: state.alice.token,
      })
    );
    expectErr(
      await state.req("GET", `/api/opportunities/${opportunityId}`, {
        token: state.alice.token,
      }),
      404,
      "NOT_FOUND"
    );
  });

  test("creating with an invalid date returns 422", async () => {
    expectErr(
      await state.req("POST", "/api/opportunities", {
        token: state.alice.token,
        body: { title: "Bad date", type: "Event", date: "july-2026" },
      }),
      422,
      "VALIDATION_ERROR"
    );
  });
});

describe("stories", () => {
  test("POST creates a story that lists", async () => {
    const data = expectOk(
      await state.req("POST", "/api/stories", {
        token: state.bob.token,
        body: { image: "data:image/jpeg;base64,BBBB" },
      }),
      201
    );
    expect(data.story.image).toBe("data:image/jpeg;base64,BBBB");
    expect(data.story.user.fullName).toBe("Bob");

    const list = expectOk(
      await state.req("GET", "/api/stories", { token: state.alice.token })
    );
    expect(list.stories.some((s) => s.id === data.story.id)).toBe(true);
  });

  test("creating a story without an image returns 422", async () => {
    expectErr(
      await state.req("POST", "/api/stories", {
        token: state.bob.token,
        body: { image: " " },
      }),
      422,
      "VALIDATION_ERROR"
    );
  });
});

function baseUrl() {
  const meta = JSON.parse(
    readFileSync(path.join(root, "tests", ".tmp", "api-run.json"), "utf8")
  );
  return meta.baseUrl;
}