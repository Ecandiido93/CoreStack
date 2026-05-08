import { Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service";
import { registerSchema, loginSchema } from "./auth.schema";
import { AuthenticatedRequest } from "../../core/middlewares/auth.middleware";
import { env } from "../../core/config/env";

const authService = new AuthService();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: parseInt(env.REFRESH_TOKEN_EXPIRES_DAYS) * 24 * 60 * 60 * 1000,
  path: "/",
};

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const data = registerSchema.parse(req.body);
    const result = await authService.register(data);

    res.cookie("refreshToken", result.refreshToken, COOKIE_OPTIONS);

    res.status(201).json({
      message: "User created",
      userId: result.user.id,
      accessToken: result.accessToken,
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data);

    res.cookie("refreshToken", result.refreshToken, COOKIE_OPTIONS);

    res.json({
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    // Lê o refreshToken do cookie HttpOnly — nunca do body
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: "Refresh token não encontrado" });
    }

    const result = await authService.refresh(refreshToken);

    // Seta o novo cookie com o token rotacionado
    res.cookie("refreshToken", result.refreshToken, COOKIE_OPTIONS);

    res.json({
      accessToken: result.accessToken,
      accessTokenExpires: result.accessTokenExpires,
      refreshTokenHash: result.refreshTokenHash,
      refreshTokenExpires: result.refreshTokenExpires,
      familyId: result.familyId,
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    // Limpa o cookie independente de ter token ou não
    res.clearCookie("refreshToken", { path: "/" });

    res.json({ message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization!.split(" ")[1];
    const user = await authService.me(token);
    res.json(user);
  } catch (err) {
    next(err);
  }
}
