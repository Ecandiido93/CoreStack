import { Router } from "express";
import { authMiddleware } from "../../core/middlewares/auth.middleware";
import { tenantMiddleware } from "../../core/middlewares/tenant.middleware";
import {
  getProfile, updateProfile,
  getSessions, revokeSession,
  getAllUsers, revokeAllUserSessions,
} from "./user.controller";

const router = Router();

// Todas as rotas exigem tenant + auth
router.use(tenantMiddleware as any);
router.use(authMiddleware);

// Perfil do próprio usuário
router.get("/me", getProfile);
router.put("/me", updateProfile);
router.get("/me/sessions", getSessions);
router.delete("/me/sessions/:sessionId", revokeSession);

// Admin
router.get("/", getAllUsers);
router.delete("/:userId/sessions", revokeAllUserSessions);

export default router;
