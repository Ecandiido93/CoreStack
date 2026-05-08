import { Router } from "express";
import { register, login, refresh, logout, me } from "./auth.controller";
import { authMiddleware } from "../../core/middlewares/auth.middleware";
import { tenantMiddleware } from "../../core/middlewares/tenant.middleware";

const router = Router();

// Todas as rotas de auth precisam de tenant
router.use(tenantMiddleware as any);

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", authMiddleware, me);

export default router;
