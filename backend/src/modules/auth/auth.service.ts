import { RegisterDTO, LoginDTO, RefreshDTO } from "./auth.schema";
import { hashPassword, comparePassword } from "./hash.util";
import { createSession, rotateRefreshToken } from "./token.service";
import { prisma } from "../../config/prisma";
import { UnauthorizedError, ConflictError } from "../../core/errors/httpError";
import jwt from "jsonwebtoken";
import { hashToken } from "./hash.util";

const JWT_SECRET = process.env.JWT_SECRET!;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET não definido no .env");
}

export class AuthService {
  async register(data: RegisterDTO) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictError("Email já está em uso");
    }

    const hashedPassword = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
      },
    });

    const { accessToken, refreshToken } = await createSession(user.id);

    return {
      user: { id: user.id, name: user.name, email: user.email },
      accessToken,
      refreshToken,
    };
  }

  async login(data: LoginDTO) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
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

  async refresh(data: RefreshDTO) {
    const newRefreshToken = await rotateRefreshToken(data.refreshToken);

    const decoded: any = jwt.verify(newRefreshToken, JWT_SECRET);

    // Buscar registro do refresh token no banco
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(newRefreshToken) },
    });

    // Access token já gerado dentro do rotateRefreshToken via createSession,
    // mas aqui geramos com o sessionId correto do novo refresh token
    const { accessToken: newAccessToken } = await Promise.resolve({
      accessToken: jwt.sign(
        { userId: decoded.userId, sessionId: decoded.sessionId },
        JWT_SECRET,
        { expiresIn: "15m" }
      ),
    });

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
      const decoded: any = jwt.verify(refreshToken, JWT_SECRET);

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
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; exp?: number };

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
      throw new Error("Token inválido");
    }
  }
}