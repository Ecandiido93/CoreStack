import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorMiddleware } from "../../core/middlewares/error.middleware";
import authRoutes from "../../modules/auth/auth.routes";
import userRoutes from "../../modules/user/user.routes";

export function makeApp() {
  const app = express();
  app.use(cors({ origin: "*", credentials: true }));
  app.use(cookieParser());
  app.use(express.json());
  app.use("/auth", authRoutes);
  app.use("/users", userRoutes);
  app.use(errorMiddleware);
  return app;
}
