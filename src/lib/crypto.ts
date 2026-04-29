import crypto from 'crypto'

const RAW_KEY = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'fallback-key-change-in-prod'

/** Derives a 32-byte AES key from the environment secret using scrypt. */
function deriveKey(): Buffer {
  return crypto.scryptSync(RAW_KEY, 'whatsapp-bot-salt', 32)
}

/**
 * Encrypts plaintext with AES-256-GCM.
 * Returns iv:authTag:ciphertext as hex strings joined by ':'.
 */
export function encrypt(plaintext: string): string {
  const key = deriveKey()
  const iv = crypto.randomBytes(12) // 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Decrypts a string produced by encrypt().
 */
export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted format')
  const [ivHex, tagHex, encHex] = parts
  const key = deriveKey()
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(tagHex, 'hex')
  const encrypted = Buffer.from(encHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

/** Generates a cryptographically secure random token (hex). */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex')
}
