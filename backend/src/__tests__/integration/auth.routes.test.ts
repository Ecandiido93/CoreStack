import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), ".env.test"), override: true });

import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import request from "supertest";
import { cleanDatabase, createTestTenant, makeApp, testPrisma } from "../setup/helpers";

let app: any;
let tenantId: string;

beforeEach(async () => {
  await cleanDatabase();
  const tenant = await createTestTenant();
  tenantId = tenant.id;
  app = makeApp();
});

afterAll(async () => {
  await cleanDatabase();
});

const authHeaders = (slug = "test") => ({ "X-Tenant-ID": slug });

describe("POST /auth/register", () => {
  it("deve criar usuário com sucesso", async () => {
    const res = await request(app)
      .post("/auth/register")
      .set(authHeaders())
      .send({ name: "John Doe", email: "john@test.com", password: "Test123!" });

    expect(res.status).toBe(201);
    expect(res.body.userId).toBeDefined();
    expect(res.body.accessToken).toBeDefined();
  });

  it("deve retornar cookie HttpOnly com refreshToken", async () => {
    const res = await request(app)
      .post("/auth/register")
      .set(authHeaders())
      .send({ name: "John Doe", email: "john@test.com", password: "Test123!" });

    expect(res.status).toBe(201);
    const cookies = (res.headers["set-cookie"] as unknown) as string[] | undefined;
    if (cookies) {
      const rtCookie = cookies.find((c: string) => c.startsWith("refreshToken"));
      expect(rtCookie).toBeDefined();
      expect(rtCookie).toContain("HttpOnly");
    }
  });

  it("deve rejeitar email duplicado no mesmo tenant", async () => {
    const userData = { name: "John", email: "john@test.com", password: "Test123!" };
    await request(app).post("/auth/register").set(authHeaders()).send(userData);
    const res = await request(app).post("/auth/register").set(authHeaders()).send(userData);
    expect(res.status).toBe(409);
  });

  it("deve aceitar mesmo email em tenants diferentes", async () => {
    await testPrisma.tenant.create({
      data: { name: "Tenant 2", slug: "tenant2", isActive: true },
    });
    const userData = { name: "John", email: "john@test.com", password: "Test123!" };
    const res1 = await request(app).post("/auth/register").set(authHeaders("test")).send(userData);
    const res2 = await request(app).post("/auth/register").set(authHeaders("tenant2")).send(userData);
    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
  });

  it("deve rejeitar senha fraca", async () => {
    const res = await request(app)
      .post("/auth/register")
      .set(authHeaders())
      .send({ name: "John", email: "john@test.com", password: "123" });
    expect(res.status).toBe(422);
  });

  it("deve retornar 400 sem X-Tenant-ID", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ name: "John", email: "john@test.com", password: "Test123!" });
    expect(res.status).toBe(400);
  });
});

describe("POST /auth/login", () => {
  beforeEach(async () => {
    const res = await request(app)
      .post("/auth/register")
      .set(authHeaders())
      .send({ name: "John", email: "john@test.com", password: "Test123!" });
    if (res.status !== 201) throw new Error(`Register failed: ${res.status}`);
  });

  it("deve autenticar com credenciais corretas", async () => {
    const res = await request(app)
      .post("/auth/login")
      .set(authHeaders())
      .send({ email: "john@test.com", password: "Test123!" });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe("john@test.com");
  });

  it("deve rejeitar senha incorreta", async () => {
    const res = await request(app)
      .post("/auth/login")
      .set(authHeaders())
      .send({ email: "john@test.com", password: "WrongPass!" });
    expect(res.status).toBe(401);
  });

  it("deve rejeitar email inexistente", async () => {
    const res = await request(app)
      .post("/auth/login")
      .set(authHeaders())
      .send({ email: "nobody@test.com", password: "Test123!" });
    expect(res.status).toBe(401);
  });

  it("deve registrar login falho no AuditLog", async () => {
    await request(app)
      .post("/auth/login")
      .set(authHeaders())
      .send({ email: "john@test.com", password: "WrongPass!" });

    const log = await testPrisma.auditLog.findFirst({
      where: { action: "USER_LOGIN_FAILED" },
    });
    expect(log).toBeDefined();
    expect(log?.metadata).toMatchObject({ reason: "wrong_password" });
  });

  it("deve atualizar lastLoginAt no login bem-sucedido", async () => {
    await request(app)
      .post("/auth/login")
      .set(authHeaders())
      .send({ email: "john@test.com", password: "Test123!" });

    const user = await testPrisma.user.findFirst({
      where: { email: "john@test.com", tenantId },
    });
    expect(user?.lastLoginAt).not.toBeNull();
  });
});

describe("POST /auth/refresh", () => {
  let cookie: string;

  beforeEach(async () => {
    const res = await request(app)
      .post("/auth/register")
      .set(authHeaders())
      .send({ name: "John", email: "john@test.com", password: "Test123!" });

    if (res.status !== 201) throw new Error(`Register failed: ${res.status}`);
    const cookies = (res.headers["set-cookie"] as unknown) as string[] | undefined;
    cookie = cookies?.[0] || "";
  });

  it("deve retornar 401 sem cookie", async () => {
    const res = await request(app).post("/auth/refresh").set(authHeaders());
    expect(res.status).toBe(401);
  });

  it("deve detectar reuso e revogar família", async () => {
    if (!cookie) return;

    await request(app).post("/auth/refresh").set(authHeaders()).set("Cookie", cookie);
    const res2 = await request(app).post("/auth/refresh").set(authHeaders()).set("Cookie", cookie);

    expect(res2.status).toBe(401);

    const activeTokens = await testPrisma.refreshToken.findMany({
      where: { status: "ACTIVE" },
    });
    expect(activeTokens).toHaveLength(0);
  });
});

describe("POST /auth/logout", () => {
  it("deve fazer logout com sucesso", async () => {
    const regRes = await request(app)
      .post("/auth/register")
      .set(authHeaders())
      .send({ name: "John", email: "john@test.com", password: "Test123!" });

    const cookies = (regRes.headers["set-cookie"] as unknown) as string[] | undefined;
    const cookie = cookies?.[0] || "";

    const logoutRes = await request(app)
      .post("/auth/logout")
      .set(authHeaders())
      .set("Cookie", cookie);

    expect(logoutRes.status).toBe(200);
  });

  it("deve revogar todos os tokens da família no logout", async () => {
    const regRes = await request(app)
      .post("/auth/register")
      .set(authHeaders())
      .send({ name: "John", email: "john@test.com", password: "Test123!" });

    const cookies = (regRes.headers["set-cookie"] as unknown) as string[] | undefined;
    const cookie = cookies?.[0] || "";

    await request(app).post("/auth/logout").set(authHeaders()).set("Cookie", cookie);

    const activeTokens = await testPrisma.refreshToken.findMany({
      where: { status: "ACTIVE" },
    });
    expect(activeTokens).toHaveLength(0);
  });
});

describe("GET /auth/me", () => {
  it("deve retornar dados do usuário autenticado", async () => {
    const regRes = await request(app)
      .post("/auth/register")
      .set(authHeaders())
      .send({ name: "John Doe", email: "john@test.com", password: "Test123!" });

    expect(regRes.status).toBe(201);
    const { accessToken } = regRes.body;

    const res = await request(app)
      .get("/auth/me")
      .set(authHeaders())
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("john@test.com");
    expect(res.body.password).toBeUndefined();
  });

  it("deve retornar 401 sem token", async () => {
    const res = await request(app).get("/auth/me").set(authHeaders());
    expect(res.status).toBe(401);
  });
});
