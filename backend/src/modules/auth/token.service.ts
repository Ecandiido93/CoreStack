import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../../config/prisma";
import { hashToken } from "./hash.util";
import { UnauthorizedError } from "../../core/errors/httpError";

const JWT_SECRET = process.env.JWT_SECRET!;
const ACCESS_EXPIRES = "15m";
const REFRESH_EXPIRES_DAYS = 7;

export function generateAccessToken(userId: number) {
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES }
  );
}

export async function createSession(userId: number) {
  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt: new Date(
        Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000
      ),
    },
  });

  const familyId = crypto.randomUUID();

  const refreshToken = jwt.sign(
    { userId, sessionId: session.id, familyId },
    JWT_SECRET,
    { expiresIn: `${REFRESH_EXPIRES_DAYS}d` }
  );

  const tokenHash = hashToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      userId,
      sessionId: session.id,
      tokenHash,
      familyId,
      status: "ACTIVE",
      expiresAt: session.expiresAt,
    },
  });

  return refreshToken;
}

export async function rotateRefreshToken(oldRefreshToken: string) {
  let decoded: any;

  try {
    decoded = jwt.verify(oldRefreshToken, JWT_SECRET);
  } catch {
    throw new UnauthorizedError("Invalid refresh token");
  }

  const tokenHash = hashToken(oldRefreshToken);

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });

  if (!stored) {
    throw new UnauthorizedError("Invalid refresh token");
  }

  const session = await prisma.session.findUnique({
    where: { id: stored.sessionId },
  });

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
    data: {
      status: "USED",
      consumedAt: new Date(),
    },
  });

  const newRefreshToken = jwt.sign(
    {
      userId: stored.userId,
      sessionId: stored.sessionId,
      familyId: stored.familyId,
    },
    JWT_SECRET,
    { expiresIn: `${REFRESH_EXPIRES_DAYS}d` }
  );

  const newHash = hashToken(newRefreshToken);

  const newRecord = await prisma.refreshToken.create({
    data: {
      userId: stored.userId,
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
    where: {
      familyId,
      status: "ACTIVE",
    },
    data: {
      status: "REVOKED",
    },
  });
}