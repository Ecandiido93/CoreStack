import { config } from "dotenv";
import { z } from "zod";

// Carrega o .env antes de qualquer validação
config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatório"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET deve ter pelo menos 32 caracteres para ser seguro"),
  PORT: z.string().default("3001"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  REFRESH_TOKEN_EXPIRES_DAYS: z.string().default("7"),
  ACCESS_TOKEN_EXPIRES: z.string().default("15m"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Variáveis de ambiente inválidas:\n");
  parsed.error.issues.forEach((issue: z.ZodIssue) => {
    console.error(`  → ${issue.path.join(".")}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsed.data;
