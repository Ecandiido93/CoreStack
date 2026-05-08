import { RegisterDTO, LoginDTO } from "./auth.schema";
import { hashPassword, comparePassword } from "./hash.util";
import { createSession, rotateRefreshToken } from "./token.service";
import { prisma } from "../../config/prisma";
import { UnauthorizedError, ConflictError } from "../../core/errors/httpError";
import jwt, { SignOptions } from "jsonwebtoken";
import { hashToken } from "./hash.util";
import { env } from "../../core/config/env";
import { userRepository } from "../user/user.repository";
import { buildFingerprint } from "../../core/utils/fingerprint";
import { Request } from "express";

export class AuthService {
  async register(data: RegisterDTO, tenantId: string, req: Request) {
    const existingUser = await userRepository.findByEmail(tenantId, data.email);
    if (existingUser) throw new ConflictError("Email já está em uso");

    const hashedPassword = await hashPassword(data.password);

    const user = await prisma.$transaction(async (tx) => {
      return tx.user.create({
        data: { tenantId, name: data.name, email: data.email, password: hashedPassword },
        select: { id: true, tenantId: true, name: true, email: true, role: true },
      });
    });

    const fingerprint = buildFingerprint(req);
    const { accessToken, refreshToken } = await createSession(user.id, tenantId, req);

    // Registra ou atualiza fingerprint
    await this.upsertFingerprint(tenantId, user.id, fingerprint);

    return { user, accessToken, refreshToken };
  }

  async login(data: LoginDTO, tenantId: string, req: Request) {
    const user = await userRepository.findByEmail(tenantId, data.email);
    if (!user) throw new UnauthorizedError("Credenciais inválidas");

    const passwordMatch = await comparePassword(data.password, user.password);
    if (!passwordMatch) throw new UnauthorizedError("Credenciais inválidas");

    // Atualiza lastLoginAt
    await userRepository.update(tenantId, user.id, { lastLoginAt: new Date() });

    const fingerprint = buildFingerprint(req);
    const { accessToken, refreshToken } = await createSession(user.id, tenantId, req);

    // Registra ou atualiza fingerprint
    await this.upsertFingerprint(tenantId, user.id, fingerprint);

    return {
      user: { id: user.id, name: user.name, email: user.email },
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    const newRefreshToken = await rotateRefreshToken(refreshToken);

    const decoded: any = jwt.verify(newRefreshToken, env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(newRefreshToken) },
    });

    const newAccessToken = jwt.sign(
      { userId: decoded.userId, sessionId: decoded.sessionId, tenantId: decoded.tenantId },
      env.JWT_SECRET,
      { expiresIn: env.ACCESS_TOKEN_EXPIRES as SignOptions["expiresIn"], algorithm: "HS256" }
    );

    return {
      accessToken: newAccessToken,
      accessTokenExpires: new Date(Date.now() + 15 * 60 * 1000),
      refreshToken: newRefreshToken,
      refreshTokenHash: tokenRecord?.tokenHash,
      refreshTokenExpires: tokenRecord?.expiresAt,
      familyId: decoded.familyId,
    };
  }

  async logout(refreshToken: string) {
    try {
      const decoded: any = jwt.verify(refreshToken, env.JWT_SECRET, {
        algorithms: ["HS256"],
      });
      await prisma.refreshToken.updateMany({
        where: { familyId: decoded.familyId },
        data: { status: "REVOKED" },
      });
    } catch {
      throw new UnauthorizedError("Invalid refresh token");
    }
  }

  async me(token: string) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ["HS256"],
      }) as { userId: number; tenantId: string; exp?: number };

      const user = await userRepository.findById(decoded.tenantId, decoded.userId);
      if (!user) throw new Error("Usuário não encontrado");

      const session = await prisma.session.findFirst({
        where: { userId: user.id, tenantId: decoded.tenantId },
        orderBy: { createdAt: "desc" },
      });

      const refreshTokenRecord = session
        ? await prisma.refreshToken.findFirst({
            where: { sessionId: session.id, status: "ACTIVE" },
          })
        : null;

      return {
        ...user,
        accessTokenExpires: decoded.exp ? new Date(decoded.exp * 1000) : null,
        refreshTokenHash: refreshTokenRecord?.tokenHash || null,
        refreshTokenExpires: refreshTokenRecord?.expiresAt || null,
        familyId: refreshTokenRecord?.familyId || null,
      };
    } catch {
      throw new UnauthorizedError("Token inválido");
    }
  }

  private async upsertFingerprint(tenantId: string, userId: number, fp: ReturnType<typeof buildFingerprint>) {
    await prisma.deviceFingerprint.upsert({
      where: { tenantId_userId_fingerprintHash: { tenantId, userId, fingerprintHash: fp.hash } },
      update: { lastSeenAt: new Date(), seenCount: { increment: 1 } },
      create: {
        tenantId, userId,
        fingerprintHash: fp.hash,
        ipAddress: fp.ipAddress,
        userAgent: fp.userAgent,
        acceptLanguage: fp.acceptLanguage,
        timezone: fp.timezone,
      },
    });
  }
}
