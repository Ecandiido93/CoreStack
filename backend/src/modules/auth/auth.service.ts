import { RegisterDTO, LoginDTO } from "./auth.schema";
import { hashPassword, comparePassword } from "./hash.util";
import { createSession, rotateRefreshToken } from "./token.service";
import { prisma } from "../../config/prisma";
import { UnauthorizedError, ConflictError } from "../../core/errors/httpError";
import jwt, { SignOptions } from "jsonwebtoken";
import { hashToken } from "./hash.util";
import { env } from "../../core/config/env";

export class AuthService {
  async register(data: RegisterDTO) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });

    if (existingUser) throw new ConflictError("Email já está em uso");

    const hashedPassword = await hashPassword(data.password);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: data.name, email: data.email, password: hashedPassword },
        select: { id: true, name: true, email: true },
      });
      return user;
    });

    const { accessToken, refreshToken } = await createSession(result.id);

    return { user: result, accessToken, refreshToken };
  }

  async login(data: LoginDTO) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true, name: true, email: true, password: true },
    });

    if (!user) throw new UnauthorizedError("Credenciais inválidas");

    const passwordMatch = await comparePassword(data.password, user.password);
    if (!passwordMatch) throw new UnauthorizedError("Credenciais inválidas");

    const { accessToken, refreshToken } = await createSession(user.id);

    return {
      user: { id: user.id, name: user.name, email: user.email },
      accessToken,
      refreshToken,
    };
  }

  // Agora recebe o refreshToken direto (vindo do cookie pelo controller)
  async refresh(refreshToken: string) {
    const newRefreshToken = await rotateRefreshToken(refreshToken);

    const decoded: any = jwt.verify(newRefreshToken, env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(newRefreshToken) },
    });

    const newAccessToken = jwt.sign(
      { userId: decoded.userId, sessionId: decoded.sessionId },
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
      }) as { userId: number; exp?: number };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, name: true, email: true },
      });

      if (!user) throw new Error("Usuário não encontrado");

      const session = await prisma.session.findFirst({
        where: { userId: user.id },
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
}
