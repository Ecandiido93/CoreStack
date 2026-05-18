import { prisma } from "../../config/prisma";

export async function cleanupExpired() {
  const now = new Date();

  const [sessions, tokens] = await Promise.all([
    // Expira sessões vencidas
    prisma.session.deleteMany({
      where: { expiresAt: { lt: now } },
    }),
    // Remove tokens expirados ou já usados/revogados há mais de 30 dias
    prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          {
            status: { in: ["USED", "REVOKED"] },
            createdAt: { lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
          },
        ],
      },
    }),
  ]);

  console.log(`[CLEANUP] Sessions removed: ${sessions.count} | Tokens removed: ${tokens.count}`);
  return { sessions: sessions.count, tokens: tokens.count };
}

export function startCleanupJob(intervalHours = 6) {
  const ms = intervalHours * 60 * 60 * 1000;

  // Roda imediatamente no boot e depois em intervalo
  setTimeout(async () => {
    await cleanupExpired();
    setInterval(cleanupExpired, ms);
  }, 5000); // aguarda 5s para o servidor estar pronto

  console.log(`🧹 Cleanup job scheduled every ${intervalHours}h`);
}
