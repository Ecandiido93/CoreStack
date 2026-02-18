import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../../config/prisma";
import { hashToken } from "./hash.util";

const JWT_SECRET = process.env.JWT_SECRET!;
const ACCESS_EXPIRES = "15m";
const REFRESH_EXPIRES_DAYS = 7;

function generateFamilyId() {
  return crypto.randomUUID();
}

export async function register(name: string, email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("Email already in use");

  const hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, password: hash }
  });

  await prisma.auditLog.create({
    data: { userId: user.id, action: "USER_REGISTER" }
  });

  return user;
}

export async function login(email: string, password: string, ip?: string, agent?: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Invalid credentials");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error("Invalid credentials");

  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES }
  );

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRES_DAYS);

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      ipAddress: ip,
      userAgent: agent,
      expiresAt
    }
  });

  const familyId = generateFamilyId();

  const refreshToken = jwt.sign(
    {
      userId: user.id,
      sessionId: session.id,
      familyId
    },
    JWT_SECRET,
    { expiresIn: `${REFRESH_EXPIRES_DAYS}d` }
  );

  const tokenHash = hashToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      sessionId: session.id,
      tokenHash,
      familyId,
      status: "ACTIVE",
      expiresAt
    }
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() }
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "USER_LOGIN",
      ipAddress: ip,
      userAgent: agent
    }
  });

  return { accessToken, refreshToken };
}

export async function logout(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash }
  });

  if (!stored) return;

  await prisma.refreshToken.updateMany({
    where: { familyId: stored.familyId, status: "ACTIVE" },
    data: { status: "REVOKED" }
  });
}
