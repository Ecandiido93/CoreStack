import { Router } from "express";
import { register, login, refresh, logout, me } from "./auth.controller";
import { authMiddleware } from "../../core/middlewares/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", authMiddleware, me);  // protegido pelo middleware

export default router;
