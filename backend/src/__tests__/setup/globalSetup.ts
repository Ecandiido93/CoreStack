import { execSync } from "child_process";
import * as dotenv from "dotenv";
import * as path from "path";

export default async function globalSetup() {
  // Carrega .env.test com override para garantir que as variáveis estão disponíveis
  dotenv.config({ path: path.resolve(process.cwd(), ".env.test"), override: true });

  const dbUrl = process.env.DATABASE_URL_TEST;
  if (!dbUrl) {
    throw new Error("DATABASE_URL_TEST não definido no .env.test");
  }

  console.log("🧪 Setting up test database...");

  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: "inherit",
  });

  console.log("✅ Test database ready");
}
