import { prisma } from "../../config/prisma";
import { Request } from "express";

export type AuditAction =
  | "USER_REGISTER"
  | "USER_LOGIN"
  | "USER_LOGIN_FAILED"
  | "USER_LOGOUT"
  | "TOKEN_REFRESHED"
  | "TOKEN_REUSE_DETECTED"
  | "SESSION_REVOKED"
  | "SESSION_EXPIRED"
  | "PROFILE_UPDATED"
  | "PASSWORD_CHANGED";

interface AuditParams {
  action: AuditAction;
  tenantId?: string;
  userId?: number;
  req?: Request;
  metadata?: Record<string, unknown>;
}

export async function audit(params: AuditParams) {
  const { action, tenantId, userId, req, metadata } = params;

  const ipAddress = req
    ? (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown"
    : undefined;

  const userAgent = req?.headers["user-agent"];

  try {
    await prisma.auditLog.create({
      data: {
        action,
        tenantId: tenantId || null,
        userId: userId || null,
        ipAddress,
        userAgent,
        metadata: metadata ? (metadata as any) : undefined,
      },
    });
  } catch {
    // Audit nunca deve quebrar o fluxo principal
    console.error(`[AUDIT ERROR] Failed to log action: ${action}`);
  }
}
