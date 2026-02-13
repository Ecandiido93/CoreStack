import { Request, Response } from "express";
import * as authService from "./auth.service";
import * as tokenService from "./token.service";
import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET as string;

export async function register(req: Request, res: Response) {
try {
const { name, email, password } = req.body;


const user = await authService.register(name, email, password);

res.status(201).json({ message: "User created", userId: user.id });


} catch (err: any) {
res.status(400).json({ error: err.message });
}
}

export async function login(req: Request, res: Response) {
try {
const { email, password } = req.body;


const tokens = await authService.login(
  email,
  password,
  req.ip,
  req.headers["user-agent"]
);

res.json(tokens);


} catch (err: any) {
res.status(401).json({ error: err.message });
}
}

export async function logout(req: Request, res: Response) {
try {
const { refreshToken } = req.body;


await authService.logout(refreshToken);

res.json({ message: "Logged out" });


} catch {
res.status(400).json({ error: "Logout failed" });
}
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body;

  const newRefresh = await tokenService.rotateRefreshToken(refreshToken);

  const decoded = jwt.verify(newRefresh, JWT_SECRET) as any;

  const accessToken = jwt.sign(
    { userId: decoded.userId },
    JWT_SECRET,
    { expiresIn: "15m" }
  );

  res.json({ accessToken, refreshToken: newRefresh });
}
