import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../../config/prisma";
import { hashToken } from "./hash.util";

const JWT_SECRET = process.env.JWT_SECRET!;
const REFRESH_EXPIRES_DAYS = 7;


function generateRefreshToken(userId: number, familyId?: string) {
  const fid = familyId ?? crypto.randomUUID();

  const token = jwt.sign(
    { userId, familyId: fid },
    JWT_SECRET,
    { expiresIn: `${REFRESH_EXPIRES_DAYS}d` }
  );

  return { token, familyId: fid };
}

export async function rotateRefreshToken(oldRefreshToken: string) {
  const decoded = jwt.verify(oldRefreshToken, JWT_SECRET) as any;

  const tokenHash = hashToken(oldRefreshToken);

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash }
  });

  if (!stored) throw new Error("Invalid refresh token");

  if (stored.status !== "ACTIVE") {
    await revokeFamily(stored.familyId);
    throw new Error("Refresh token reuse detected");
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: {
      status: "USED",
      consumedAt: new Date()
    }
  });

  const { token: newToken } = generateRefreshToken(
    stored.userId,
    stored.familyId
  );

  const newHash = hashToken(newToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRES_DAYS);

  await prisma.refreshToken.create({
    data: {
      userId: stored.userId,
      sessionId: stored.sessionId,
      tokenHash: newHash,
      familyId: stored.familyId,
      status: "ACTIVE",
      expiresAt,
      replacedBy: null
    }
  });

  return newToken;
}

async function revokeFamily(familyId: string) {
  await prisma.refreshToken.updateMany({
    where: { familyId, status: "ACTIVE" },
    data: { status: "REVOKED" }
  });
}
