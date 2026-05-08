import { Response, NextFunction } from "express";
import { UserService } from "./user.service";
import { AuthenticatedRequest } from "../../core/middlewares/auth.middleware";
import { TenantRequest } from "../../core/middlewares/tenant.middleware";
import { z } from "zod";

type AuthTenantRequest = AuthenticatedRequest & TenantRequest;

const userService = new UserService();

const updateProfileSchema = z.object({
  name: z.string().min(3).optional(),
  email: z.string().email().optional(),
});

export async function getProfile(req: AuthTenantRequest, res: Response, next: NextFunction) {
  try {
    const user = await userService.getProfile(req.tenant!.id, req.user!.id);
    res.json(user);
  } catch (err) { next(err); }
}

export async function updateProfile(req: AuthTenantRequest, res: Response, next: NextFunction) {
  try {
    const data = updateProfileSchema.parse(req.body);
    const user = await userService.updateProfile(req.tenant!.id, req.user!.id, data);
    res.json(user);
  } catch (err) { next(err); }
}

export async function getSessions(req: AuthTenantRequest, res: Response, next: NextFunction) {
  try {
    const sessions = await userService.getSessions(req.tenant!.id, req.user!.id);
    res.json(sessions);
  } catch (err) { next(err); }
}

export async function revokeSession(req: AuthTenantRequest, res: Response, next: NextFunction) {
  try {
    await userService.revokeSession(req.tenant!.id, req.user!.id, req.params.sessionId);
    res.json({ message: "Sessão revogada com sucesso" });
  } catch (err) { next(err); }
}

export async function getAllUsers(req: AuthTenantRequest, res: Response, next: NextFunction) {
  try {
    const users = await userService.getAllUsers(req.tenant!.id, req.user!.role);
    res.json(users);
  } catch (err) { next(err); }
}

export async function revokeAllUserSessions(req: AuthTenantRequest, res: Response, next: NextFunction) {
  try {
    const result = await userService.revokeAllUserSessions(
      req.tenant!.id,
      parseInt(req.params.userId),
      req.user!.role
    );
    res.json(result);
  } catch (err) { next(err); }
}
