import "./core/config/env";
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { startCleanupJob, cleanupExpired } from "./core/services/cleanup.service";
import { errorMiddleware } from "./core/middlewares/error.middleware";
import { env } from "./core/config/env";

// ── Módulos plug and play ──────────────────────────
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/user/user.routes";

const modules = [
  { path: "/auth", router: authRoutes,  name: "auth" },
  { path: "/users", router: userRoutes, name: "users" },
  // Para adicionar um novo módulo: { path: "/novomodulo", router: novoRouter, name: "novomodulo" }
];
// ──────────────────────────────────────────────────

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
    },
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));

app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Tenant-ID", "X-Tenant-Slug", "X-Timezone"],
}));

app.use(cookieParser());
app.use(express.json());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 100,
  standardHeaders: true, legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  standardHeaders: true, legacyHeaders: false,
  message: { error: "Too many authentication attempts, please try again in 15 minutes." },
  skipSuccessfulRequests: true,
});

app.use(globalLimiter);
app.use("/auth/login", authLimiter);
app.use("/auth/register", authLimiter);

// Registro automático de módulos
modules.forEach(m => {
  app.use(m.path, m.router);
  console.log(`📦 Module registered: ${m.name} → ${m.path}`);
});

// Endpoint admin para cleanup manual
app.post("/admin/cleanup", async (req, res) => {
  const result = await cleanupExpired();
  res.json({ message: "Cleanup executed", ...result });
});

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "CoreStack API",
    version: "1.0.0",
    modules: modules.map(m => m.name),
  });
});

app.use(errorMiddleware);

startCleanupJob(6);

const server = app.listen(env.PORT, () => {
  console.log(`🚀 CoreStack API running on port ${env.PORT} [${env.NODE_ENV}]`);
});

process.on("SIGTERM", () => {
  server.close(async () => {
    const { prisma } = await import("./config/prisma");
    await prisma.$disconnect();
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  server.close(async () => {
    const { prisma } = await import("./config/prisma");
    await prisma.$disconnect();
    process.exit(0);
  });
});
