import { prisma } from "../../config/prisma";

export interface CreateUserData {
  tenantId: string;
  name: string;
  email: string;
  password: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  lastLoginAt?: Date;
}

export const userRepository = {
  async findByEmail(tenantId: string, email: string) {
    return prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email } },
      select: { id: true, tenantId: true, name: true, email: true, password: true, role: true, lastLoginAt: true },
    });
  },

  async findById(tenantId: string, id: number) {
    return prisma.user.findFirst({
      where: { id, tenantId },
      select: { id: true, tenantId: true, name: true, email: true, role: true, lastLoginAt: true, createdAt: true },
    });
  },

  async create(data: CreateUserData) {
    return prisma.user.create({
      data,
      select: { id: true, tenantId: true, name: true, email: true, role: true },
    });
  },

  async update(tenantId: string, id: number, data: UpdateUserData) {
    return prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, lastLoginAt: true },
    });
  },

  async findActiveSessions(tenantId: string, userId: number) {
    return prisma.session.findMany({
      where: {
        tenantId,
        userId,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        lastSeenAt: true,
        expiresAt: true,
      },
      orderBy: { lastSeenAt: "desc" },
    });
  },

  async revokeSession(tenantId: string, userId: number, sessionId: string) {
    // Revoga todos os refresh tokens da sessão
    await prisma.refreshToken.updateMany({
      where: { tenantId, userId, sessionId, status: "ACTIVE" },
      data: { status: "REVOKED" },
    });

    // Expira a sessão imediatamente
    return prisma.session.updateMany({
      where: { id: sessionId, tenantId, userId },
      data: { expiresAt: new Date() },
    });
  },

  async findAll(tenantId: string) {
    return prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        lastLoginAt: true,
        createdAt: true,
        _count: { select: { sessions: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },
};
