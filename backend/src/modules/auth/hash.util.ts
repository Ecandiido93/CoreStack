import bcrypt from "bcrypt";
import crypto from "crypto";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hashed: string
) {
  return bcrypt.compare(password, hashed);
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}