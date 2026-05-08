import jwt, { SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../../config/prisma";
import { hashToken } from "./hash.util";
import { UnauthorizedError } from "../../core/errors/httpError";
import { env } from "../../core/config/env";
import { Request } from "express";

const ACCESS_EXPIRES = env.ACCESS_TOKEN_EXPIRES as SignOptions["expiresIn"];
const REFRESH_EXPIRES_DAYS = parseInt(env.REFRESH_TOKEN_EXPIRES_DAYS);

export function generateAccessToken(userId: number, sessionId: string, tenantId: string) {
  return jwt.sign(
    { userId, sessionId, tenantId },
    env.JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES, algorithm: "HS256" }
  );
}

export async function createSession(userId: number, tenantId: string, req: Request) {
  const ipAddress =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";

  const session = await prisma.session.create({
    data: {
      userId,
      tenantId,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  const familyId = crypto.randomUUID();

  const refreshToken = jwt.sign(
    { userId, sessionId: session.id, familyId, tenantId },
    env.JWT_SECRET,
    { expiresIn: `${REFRESH_EXPIRES_DAYS}d`, algorithm: "HS256" }
  );

  const tokenHash = hashToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      userId, tenantId,
      sessionId: session.id,
      tokenHash, familyId,
      status: "ACTIVE",
      expiresAt: session.expiresAt,
    },
  });

  return { accessToken: generateAccessToken(userId, session.id, tenantId), refreshToken };
}

export async function rotateRefreshToken(oldRefreshToken: string) {
  let decoded: any;

  try {
    decoded = jwt.verify(oldRefreshToken, env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    throw new UnauthorizedError("Invalid refresh token");
  }

  const tokenHash = hashToken(oldRefreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored) throw new UnauthorizedError("Invalid refresh token");

  const session = await prisma.session.findUnique({ where: { id: stored.sessionId } });

  if (!session || session.expiresAt < new Date()) {
    await revokeFamily(stored.familyId);
    throw new UnauthorizedError("Session expired");
  }

  if (stored.status !== "ACTIVE") {
    await revokeFamily(stored.familyId);
    throw new UnauthorizedError("Refresh token reuse detected");
  }

  if (stored.expiresAt < new Date()) {
    await revokeFamily(stored.familyId);
    throw new UnauthorizedError("Refresh token expired");
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { status: "USED", consumedAt: new Date() },
  });

  // Atualiza lastSeenAt da sessão
  await prisma.session.update({
    where: { id: session.id },
    data: { lastSeenAt: new Date() },
  });

  const newRefreshToken = jwt.sign(
    { userId: stored.userId, sessionId: stored.sessionId, familyId: stored.familyId, tenantId: stored.tenantId },
    env.JWT_SECRET,
    { expiresIn: `${REFRESH_EXPIRES_DAYS}d`, algorithm: "HS256" }
  );

  const newHash = hashToken(newRefreshToken);

  const newRecord = await prisma.refreshToken.create({
    data: {
      userId: stored.userId, tenantId: stored.tenantId,
      sessionId: stored.sessionId,
      tokenHash: newHash,
      familyId: stored.familyId,
      status: "ACTIVE",
      expiresAt: stored.expiresAt,
    },
  });

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { replacedBy: newRecord.id },
  });

  return newRefreshToken;
}

async function revokeFamily(familyId: string) {
  await prisma.refreshToken.updateMany({
    where: { familyId, status: "ACTIVE" },
    data: { status: "REVOKED" },
  });
}
