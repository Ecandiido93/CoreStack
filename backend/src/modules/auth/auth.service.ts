import { RegisterDTO, LoginDTO, RefreshDTO } from "./auth.schema";
import { hashPassword, comparePassword } from "./hash.util";
import {
  generateAccessToken,
  createSession,
  rotateRefreshToken,
} from "./token.service";
import { prisma } from "../../config/prisma";
import { UnauthorizedError, ConflictError } from "../../core/errors/HttpError";
import jwt from "jsonwebtoken";

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

    const accessToken = generateAccessToken(user.id);
    const refreshToken = await createSession(user.id);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      accessToken,
      refreshToken,
    };
  }

  async login(data: LoginDTO) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new UnauthorizedError("Credenciais inválidas");
    }

    const passwordMatch = await comparePassword(
      data.password,
      user.password
    );

    if (!passwordMatch) {
      throw new UnauthorizedError("Credenciais inválidas");
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = await createSession(user.id);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      accessToken,
      refreshToken,
    };
  }

  async refresh(data: RefreshDTO) {
    const newRefreshToken = await rotateRefreshToken(data.refreshToken);

    const decoded = jwt.verify(
      newRefreshToken,
      process.env.JWT_SECRET!
    ) as any;

    const newAccessToken = generateAccessToken(decoded.userId);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string) {
    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_SECRET!
      ) as any;

      await prisma.refreshToken.updateMany({
        where: {
          familyId: decoded.familyId,
        },
        data: {
          status: "REVOKED",
        },
      });
    } catch {
      throw new UnauthorizedError("Invalid refresh token");
    }
  }
}