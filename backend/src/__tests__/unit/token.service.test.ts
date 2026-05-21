import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

import { hashToken } from "../../modules/auth/hash.util";
import { generateAccessToken } from "../../modules/auth/token.service";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

describe("hashToken", () => {
  it("deve gerar sempre o mesmo hash para o mesmo input", () => {
    const token = "test-token-123";
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it("deve gerar hashes diferentes para tokens diferentes", () => {
    expect(hashToken("token-a")).not.toBe(hashToken("token-b"));
  });

  it("deve gerar hash com 64 caracteres (SHA-256 hex)", () => {
    expect(hashToken("qualquer-token")).toHaveLength(64);
  });
});

describe("generateAccessToken", () => {
  it("deve gerar um token JWT válido", () => {
    const token = generateAccessToken(1, "session-id", "tenant-id");
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
  });

  it("deve incluir userId, sessionId e tenantId no payload", () => {
    const token = generateAccessToken(42, "sess-123", "tenant-abc");
    const decoded: any = jwt.verify(token, JWT_SECRET);
    expect(decoded.userId).toBe(42);
    expect(decoded.sessionId).toBe("sess-123");
    expect(decoded.tenantId).toBe("tenant-abc");
  });

  it("deve usar algoritmo HS256", () => {
    const token = generateAccessToken(1, "sess", "tenant");
    const header = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString());
    expect(header.alg).toBe("HS256");
  });

  it("deve expirar em 15 minutos", () => {
    const token = generateAccessToken(1, "sess", "tenant");
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const expiresIn = decoded.exp - decoded.iat;
    expect(expiresIn).toBe(15 * 60);
  });
});
