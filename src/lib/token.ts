import { randomBytes } from "crypto";

// 24 hex chars (12 bytes), Clockify-style public token.
export function generateToken(): string {
  return randomBytes(12).toString("hex");
}
