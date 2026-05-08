import { userRepository } from "./user.repository";
import { NotFoundError, ForbiddenError } from "../../core/errors/httpError";

export class UserService {
  async getProfile(tenantId: string, userId: number) {
    const user = await userRepository.findById(tenantId, userId);
    if (!user) throw new NotFoundError("Usuário não encontrado");
    return user;
  }

  async updateProfile(tenantId: string, userId: number, data: { name?: string; email?: string }) {
    const user = await userRepository.findById(tenantId, userId);
    if (!user) throw new NotFoundError("Usuário não encontrado");
    return userRepository.update(tenantId, userId, data);
  }

  async getSessions(tenantId: string, userId: number) {
    return userRepository.findActiveSessions(tenantId, userId);
  }

  async revokeSession(tenantId: string, userId: number, sessionId: string) {
    const sessions = await userRepository.findActiveSessions(tenantId, userId);
    const session = sessions.find(s => s.id === sessionId);
    if (!session) throw new NotFoundError("Sessão não encontrada");
    return userRepository.revokeSession(tenantId, userId, sessionId);
  }

  // Admin only
  async getAllUsers(tenantId: string, requestingUserRole: string) {
    if (requestingUserRole !== "ADMIN") throw new ForbiddenError("Acesso restrito a administradores");
    return userRepository.findAll(tenantId);
  }

  async revokeAllUserSessions(tenantId: string, targetUserId: number, requestingUserRole: string) {
    if (requestingUserRole !== "ADMIN") throw new ForbiddenError("Acesso restrito a administradores");
    const sessions = await userRepository.findActiveSessions(tenantId, targetUserId);
    await Promise.all(
      sessions.map(s => userRepository.revokeSession(tenantId, targetUserId, s.id))
    );
    return { revoked: sessions.length };
  }
}
