import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const DEFAULT_SECRET_KEY = process.env.PAYLOAD_ENCRYPTION_KEY || 'nexus-32-byte-secret-encryption-key-!';
const CLIENT_SECRET = process.env.CLIENT_APP_SECRET || 'NEXUS-ANDROID-APP-SECRET-V1-SECURE';

/**
 * Normalizes a key to 32 bytes for AES-256
 */
function getDerivedKey(keyString: string): Buffer {
  return crypto.createHash('sha256').update(keyString).digest();
}

/**
 * Encrypts arbitrary text or JSON payload using AES-256-CBC with a random IV
 * Returns a base64 encoded string containing IV + Encrypted Data + HMAC signature
 */
export function encryptPayload(data: string | object, secretKey: string = DEFAULT_SECRET_KEY): string {
  const text = typeof data === 'object' ? JSON.stringify(data) : String(data);
  const key = getDerivedKey(secretKey);
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Compute HMAC to prevent tampering
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(iv.toString('hex') + ':' + encrypted);
  const tag = hmac.digest('hex');

  const payloadObj = {
    v: '1.0',
    iv: iv.toString('hex'),
    payload: encrypted,
    tag,
    ts: Date.now()
  };

  return Buffer.from(JSON.stringify(payloadObj)).toString('base64');
}

/**
 * Decrypts an encrypted payload produced by encryptPayload
 */
export function decryptPayload(encryptedBase64: string, secretKey: string = DEFAULT_SECRET_KEY): string {
  try {
    const raw = Buffer.from(encryptedBase64, 'base64').toString('utf8');
    const { iv, payload, tag } = JSON.parse(raw);
    const key = getDerivedKey(secretKey);

    // Verify HMAC tag
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(iv + ':' + payload);
    const calculatedTag = hmac.digest('hex');

    if (calculatedTag !== tag) {
      throw new Error('Integrity check failed: HMAC mismatch');
    }

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(payload, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err: any) {
    throw new Error(`Decryption failed: ${err.message}`);
  }
}

/**
 * Generates an Android client signature token
 */
export function generateClientSignature(clientHwid: string, timestamp: number): string {
  return crypto
    .createHmac('sha256', CLIENT_SECRET)
    .update(`${clientHwid}:${timestamp}:${CLIENT_SECRET}`)
    .digest('hex');
}

/**
 * Validates an Android client signature
 */
export function verifyClientSignature(clientHwid: string, timestamp: number, signature: string): boolean {
  if (!signature) return false;
  // Allow timestamp within 15 minutes window
  const now = Date.now();
  if (Math.abs(now - timestamp) > 15 * 60 * 1000) {
    return false;
  }
  const expected = generateClientSignature(clientHwid, timestamp);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/**
 * Generates formatted VIP license keys: NET-VIP-XXXX-YYYY
 */
export function generateVpnLicenseKey(prefix = 'NET-VIP'): string {
  const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${part1}-${part2}`;
}

/**
 * Bcrypt password hashing & verification
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
