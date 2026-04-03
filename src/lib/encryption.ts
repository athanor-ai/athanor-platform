/**
 * Server-side credential encryption using AES-256-GCM.
 *
 * This module must ONLY be imported in server-side code (API routes,
 * Server Actions). It uses Node.js crypto which is unavailable in the browser.
 *
 * Format: "iv:ciphertext:authTag" (all hex-encoded)
 */
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

function getMasterKey(): Buffer {
  const key = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "CREDENTIAL_ENCRYPTION_KEY not set. Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  const buf = Buffer.from(key, "hex");
  if (buf.length !== 32) {
    throw new Error(
      `CREDENTIAL_ENCRYPTION_KEY must be 64 hex chars (32 bytes). Got ${key.length} chars.`,
    );
  }
  return buf;
}

/**
 * Encrypt an API key for storage.
 * Returns "iv:ciphertext:authTag" (hex-encoded).
 */
export function encryptKey(plaintext: string): string {
  const masterKey = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${encrypted}:${authTag.toString("hex")}`;
}

/**
 * Decrypt an API key from storage.
 * Input format: "iv:ciphertext:authTag" (hex-encoded).
 */
export function decryptKey(encrypted: string): string {
  const masterKey = getMasterKey();
  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted key format (expected iv:ciphertext:authTag)");
  }

  const [ivHex, ciphertextHex, authTagHex] = parts;
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    masterKey,
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Generate a safe display suffix for an API key.
 * e.g., "sk-ant-api03-abc123xyz" -> "...3xyz"
 */
export function getKeySuffix(plaintext: string): string {
  if (plaintext.length > 4) {
    return `...${plaintext.slice(-4)}`;
  }
  return "...****";
}
