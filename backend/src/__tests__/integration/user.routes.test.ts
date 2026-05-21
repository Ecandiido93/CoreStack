import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), ".env.test"), override: true });

import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import request from "supertest";
import { cleanDatabase, createTestTenant, makeApp, testPrisma } from "../setup/helpers";

let app: any;
let accessToken: string;
let tenantSlug: string;

beforeEach(async () => {
  await cleanDatabase();
  const tenant = await createTestTenant();
  tenantSlug = tenant.slug;
  app = makeApp();

  // Register user
  const res = await request(app)
    .post("/auth/register")
    .set("X-Tenant-ID", tenantSlug)
    .send({ name: "John Doe", email: "john@test.com", password: "Test123!" });

  if (res.status !== 201) {
    console.error("Register failed:", res.status, res.body);
    throw new Error(`Setup failed: register returned ${res.status}`);
  }

  accessToken = res.body.accessToken;
});

afterAll(async () => {
  await cleanDatabase();
});

const authHeaders = (token: string) => ({
  "X-Tenant-ID": "test",
  "Authorization": `Bearer ${token}`,
});

describe("GET /users/me", () => {
  it("deve retornar perfil do usuário autenticado", async () => {
    const res = await request(app)
      .get("/users/me")
      .set(authHeaders(accessToken));

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("john@test.com");
    expect(res.body.name).toBe("John Doe");
    expect(res.body.password).toBeUndefined();
  });

  it("deve retornar 401 sem token", async () => {
    const res = await request(app)
      .get("/users/me")
      .set("X-Tenant-ID", "test");
    expect(res.status).toBe(401);
  });
});

describe("PUT /users/me", () => {
  it("deve atualizar nome do usuário", async () => {
    const res = await request(app)
      .put("/users/me")
      .set(authHeaders(accessToken))
      .send({ name: "John Updated" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("John Updated");
  });

  it("deve registrar no AuditLog ao atualizar perfil", async () => {
    await request(app)
      .put("/users/me")
      .set(authHeaders(accessToken))
      .send({ name: "John Updated" });

    const log = await testPrisma.auditLog.findFirst({
      where: { action: "PROFILE_UPDATED" },
    });
    expect(log).toBeDefined();
  });

  it("deve rejeitar nome muito curto", async () => {
    const res = await request(app)
      .put("/users/me")
      .set(authHeaders(accessToken))
      .send({ name: "Jo" });
    expect(res.status).toBe(422);
  });
});

describe("GET /users/me/sessions", () => {
  it("deve listar sessões ativas do usuário", async () => {
    const res = await request(app)
      .get("/users/me/sessions")
      .set(authHeaders(accessToken));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe("DELETE /users/me/sessions/:sessionId", () => {
  it("deve revogar uma sessão específica", async () => {
    const sessionsRes = await request(app)
      .get("/users/me/sessions")
      .set(authHeaders(accessToken));

    const sessionId = sessionsRes.body[0]?.id;
    if (!sessionId) return;

    const revokeRes = await request(app)
      .delete(`/users/me/sessions/${sessionId}`)
      .set(authHeaders(accessToken));

    expect(revokeRes.status).toBe(200);

    const activeTokens = await testPrisma.refreshToken.findMany({
      where: { sessionId, status: "ACTIVE" },
    });
    expect(activeTokens).toHaveLength(0);
  });

  it("deve retornar 404 para sessão inexistente", async () => {
    const res = await request(app)
      .delete("/users/me/sessions/00000000-0000-0000-0000-000000000000")
      .set(authHeaders(accessToken));
    expect(res.status).toBe(404);
  });
});
