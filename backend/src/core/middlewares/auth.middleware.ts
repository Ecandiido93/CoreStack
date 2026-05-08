import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma";
import { env } from "../config/env";

interface TokenPayload {
  userId: number;
  role: string;
  sessionId: string;
  tenantId: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
    sessionId: string;
    tenantId: string;
  };
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Token não fornecido" });

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || !/^Bearer$/i.test(parts[0])) {
    return res.status(401).json({ message: "Token mal formatado" });
  }

  try {
    const decoded = jwt.verify(parts[1], env.JWT_SECRET, {
      algorithms: ["HS256"],
    }) as TokenPayload;

    const session = await prisma.session.findUnique({ where: { id: decoded.sessionId } });
    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ message: "Sessão expirada ou inválida" });
    }

    // Busca role atualizada do banco
    const user = await prisma.user.findFirst({
      where: { id: decoded.userId, tenantId: decoded.tenantId },
      select: { role: true },
    });

    (req as AuthenticatedRequest).user = {
      id: decoded.userId,
      role: user?.role || decoded.role,
      sessionId: decoded.sessionId,
      tenantId: decoded.tenantId,
    };

    return next();
  } catch {
    return res.status(401).json({ message: "Token inválido" });
  }
};
