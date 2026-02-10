import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma";

interface TokenPayload {
  userId: number;
  role: string;
  sessionId: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
    sessionId: string;
  };
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Token não fornecido" });
  }

  const parts = authHeader.split(" ");

  if (parts.length !== 2) {
    return res.status(401).json({ message: "Token mal formatado" });
  }

  const [scheme, token] = parts;

  if (!/^Bearer$/i.test(scheme)) {
    return res.status(401).json({ message: "Formato inválido" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as TokenPayload;

    const session = await prisma.session.findUnique({
      where: { id: decoded.sessionId },
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ message: "Sessão expirada ou inválida" });
    }

    const authReq = req as AuthenticatedRequest;

    authReq.user = {
      id: decoded.userId,
      role: decoded.role,
      sessionId: decoded.sessionId,
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido" });
  }
};
