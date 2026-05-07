import "./core/config/env"; // valida env no boot antes de tudo
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import authRoutes from "./modules/auth/auth.routes";
import { errorMiddleware } from "./core/middlewares/error.middleware";
import { env } from "./core/config/env";

const app = express();

// Security headers
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

// CORS configurado explicitamente
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Cookie parser para HttpOnly cookies
app.use(cookieParser());
app.use(express.json());

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

// Rate limiting específico para auth (mais restritivo)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts, please try again in 15 minutes." },
  skipSuccessfulRequests: true, // não conta tentativas bem-sucedidas
});

app.use(globalLimiter);

app.use("/auth/login", authLimiter);
app.use("/auth/register", authLimiter);

app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "CoreStack API", version: "1.0.0" });
});

// Deve ser o último middleware
app.use(errorMiddleware);

// Graceful shutdown
const server = app.listen(env.PORT, () => {
  console.log(`🚀 CoreStack API running on port ${env.PORT} [${env.NODE_ENV}]`);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM recebido — encerrando servidor...");
  server.close(async () => {
    const { prisma } = await import("./config/prisma.js");
    await prisma.$disconnect();
    console.log("✅ Servidor encerrado com sucesso");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT recebido — encerrando servidor...");
  server.close(async () => {
    const { prisma } = await import("./config/prisma.js");
    await prisma.$disconnect();
    console.log("✅ Servidor encerrado com sucesso");
    process.exit(0);
  });
});
