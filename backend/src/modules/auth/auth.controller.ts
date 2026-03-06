import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { RegisterDTO, LoginDTO, RefreshDTO } from "./auth.schema";

const authService = new AuthService();

export async function register(req: Request, res: Response) {
  try {
    const data: RegisterDTO = req.body;

    const result = await authService.register(data);

    res.status(201).json({
      message: "User created",
      userId: result.user.id,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const data: LoginDTO = req.body;

    const result = await authService.login(data);

    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
}

export async function refresh(req: Request, res: Response) {
  try {
    const data: RefreshDTO = req.body;

    const result = await authService.refresh(data);

    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;

    await authService.logout(refreshToken);

    res.json({ message: "Logged out successfully" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function me(req: Request, res: Response) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "Token não enviado" });
    }

    const token = authHeader.split(" ")[1];

    const user = await authService.me(token);

    res.json(user);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
}