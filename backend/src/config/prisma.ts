import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não definido");
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter, log: ["error", "warn"] });
}

let _prisma: PrismaClient | null = null;
let _lastUrl: string | undefined;

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const currentUrl = process.env.DATABASE_URL;
    // Recria o client se DATABASE_URL mudou (ex: entre dev e test)
    if (!_prisma || _lastUrl !== currentUrl) {
      _prisma = createPrismaClient();
      _lastUrl = currentUrl;
    }
    const value = (_prisma as any)[prop];
    return typeof value === "function" ? value.bind(_prisma) : value;
  },
});
