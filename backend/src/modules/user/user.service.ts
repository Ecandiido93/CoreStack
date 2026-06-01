import { userRepository } from "./user.repository";
import { NotFoundError, ForbiddenError } from "../../core/errors/httpError";
import { audit } from "../../core/services/audit.service";
import { Request } from "express";

export class UserService {
  async getProfile(tenantId: string, userId: number) {
    const user = await userRepository.findById(tenantId, userId);
    if (!user) throw new NotFoundError("Usuário não encontrado");
    return user;
  }

  async updateProfile(tenantId: string, userId: number, data: { name?: string; email?: string }, req?: Request) {
    const user = await userRepository.findById(tenantId, userId);
    if (!user) throw new NotFoundError("Usuário não encontrado");

    const updated = await userRepository.update(tenantId, userId, data);

    await audit({
      action: "PROFILE_UPDATED",
      tenantId, userId, req,
      metadata: { fields: Object.keys(data) },
    });

    return updated;
  }

  async getSessions(tenantId: string, userId: number) {
    return userRepository.findActiveSessions(tenantId, userId);
  }

  async revokeSession(tenantId: string, userId: number, sessionId: string, req?: Request) {
    const sessions = await userRepository.findActiveSessions(tenantId, userId);
    const session = sessions.find(s => s.id === sessionId);
    if (!session) throw new NotFoundError("Sessão não encontrada");

    await userRepository.revokeSession(tenantId, userId, sessionId);

    await audit({
      action: "SESSION_REVOKED",
      tenantId, userId, req,
      metadata: { sessionId, revokedBy: "user" },
    });

    return { message: "Sessão revogada" };
  }

  async getAllUsers(tenantId: string, requestingUserRole: string) {
    if (requestingUserRole !== "ADMIN") throw new ForbiddenError("Acesso restrito a administradores");
    return userRepository.findAll(tenantId);
  }

  async revokeAllUserSessions(tenantId: string, targetUserId: number, requestingUserRole: string, req?: Request) {
    if (requestingUserRole !== "ADMIN") throw new ForbiddenError("Acesso restrito a administradores");

    const sessions = await userRepository.findActiveSessions(tenantId, targetUserId);
    await Promise.all(sessions.map((s: any) => userRepository.revokeSession(tenantId, targetUserId, s.id)));

    await audit({
      action: "SESSION_REVOKED",
      tenantId, userId: targetUserId, req,
      metadata: { sessionCount: sessions.length, revokedBy: "admin" },
    });

    return { revoked: sessions.length };
  }
}
