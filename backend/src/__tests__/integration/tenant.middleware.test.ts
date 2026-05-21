import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), ".env.test"), override: true });

import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import request from "supertest";
import { cleanDatabase, makeApp, testPrisma } from "../setup/helpers";

let app: any;

beforeEach(async () => {
  await cleanDatabase();
  app = makeApp();
});

afterAll(async () => {
  await cleanDatabase();
});

describe("tenantMiddleware", () => {
  it("deve retornar 400 sem X-Tenant-ID", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "a@a.com", password: "Test123!" });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Tenant não identificado");
  });

  it("deve retornar 404 para tenant inexistente", async () => {
    const res = await request(app)
      .post("/auth/login")
      .set("X-Tenant-ID", "tenant-que-nao-existe")
      .send({ email: "a@a.com", password: "Test123!" });
    expect(res.status).toBe(404);
  });

  it("deve retornar 404 para tenant inativo", async () => {
    await testPrisma.tenant.create({
      data: { name: "Inactive", slug: "inactive", isActive: false },
    });
    const res = await request(app)
      .post("/auth/login")
      .set("X-Tenant-ID", "inactive")
      .send({ email: "a@a.com", password: "Test123!" });
    expect(res.status).toBe(404);
  });

  it("deve resolver tenant pelo slug", async () => {
    await testPrisma.tenant.create({
      data: { name: "Active", slug: "active-tenant", isActive: true },
    });
    const res = await request(app)
      .post("/auth/register")
      .set("X-Tenant-ID", "active-tenant")
      .send({ name: "John", email: "john@test.com", password: "Test123!" });
    expect(res.status).toBe(201);
  });

  it("deve resolver tenant pelo UUID", async () => {
    const tenant = await testPrisma.tenant.create({
      data: { name: "UUID Tenant", slug: "uuid-tenant", isActive: true },
    });
    const res = await request(app)
      .post("/auth/register")
      .set("X-Tenant-ID", tenant.id)
      .send({ name: "John", email: "john@test.com", password: "Test123!" });
    expect(res.status).toBe(201);
  });
});
