import { prisma } from "../../config/prisma";
export const testPrisma = prisma;

export { makeApp } from "./testApp";

export async function cleanDatabase() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE 
      "AuditLog",
      "DeviceFingerprint",
      "RefreshToken",
      "Session",
      "User",
      "Tenant"
    CASCADE
  `);
}

export async function createTestTenant() {
  return prisma.tenant.create({
    data: { name: "Test Tenant", slug: "test", isActive: true },
  });
}

export async function createTestUser(tenantId: string, overrides = {}) {
  const bcrypt = await import("bcrypt");
  return prisma.user.create({
    data: {
      tenantId,
      name: "Test User",
      email: "test@example.com",
      password: await bcrypt.hash("Test123!", 10),
      role: "USER",
      ...overrides,
    },
  });
}
