import crypto from "crypto";
import { Request } from "express";

export interface FingerprintData {
  hash: string;
  ipAddress: string;
  userAgent: string;
  acceptLanguage: string;
  timezone: string;
}

export function buildFingerprint(req: Request): FingerprintData {
  const ipAddress =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown";

  const userAgent = req.headers["user-agent"] || "unknown";
  const acceptLanguage = req.headers["accept-language"] || "unknown";
  const timezone = req.headers["x-timezone"] as string || "unknown";

  // Hash intermediário: IP + UA + Accept-Language + Timezone
  const raw = `${ipAddress}|${userAgent}|${acceptLanguage}|${timezone}`;
  const hash = crypto.createHash("sha256").update(raw).digest("hex");

  return { hash, ipAddress, userAgent, acceptLanguage, timezone };
}
