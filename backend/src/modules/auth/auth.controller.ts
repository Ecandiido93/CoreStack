import { Request, Response } from "express";
import * as authService from "./auth.service";

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