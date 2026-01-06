import crypto from "crypto";

// Use CLERK_SECRET_KEY as the stable secret, or fallback for development.
// In production, ensure CLERK_SECRET_KEY is set.
const SECRET =
  process.env.CLERK_SECRET_KEY || "dev-secret-key-placeholder-32-bytes-long";
const ALGORITHM = "aes-256-cbc";

// Derive a consistent 32-byte key from the secret
const getKey = () => crypto.createHash("sha256").update(SECRET).digest();

export function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    // Return as IV:EncryptedData (hex encoding)
    return iv.toString("hex") + ":" + encrypted.toString("hex");
  } catch (error) {
    console.error("Encryption failed:", error);
    return text; // Fallback to returning raw text if encryption fails (should prevent crashes)
  }
}

export function decrypt(text: string): string | null {
  try {
    const parts = text.split(":");
    if (parts.length !== 2) return null;

    const iv = Buffer.from(parts.shift()!, "hex");
    const encryptedText = Buffer.from(parts.join(":"), "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
  } catch (error) {
    console.error("Decryption failed:", error);
    return null;
  }
}
