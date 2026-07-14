import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

/**
 * Encrypts a string using AES-256-GCM.
 * The result is a base64 string containing: iv + authTag + encryptedData
 */
export function encrypt(text: string, keyBase64: string): string {
    if (!text) return ''

    if (!keyBase64) {
        throw new Error('La llave de cifrado (ADS_ENCRYPTION_KEY) no está definida en el entorno. Por favor, revisa tu archivo .env y reinicia el servidor.')
    }

    const key = Buffer.from(keyBase64.trim(), 'base64')
    if (key.length !== 32) {
        console.error(`[Encryption] Invalid key length: ${key.length} bytes (expected 32). Key source length: ${keyBase64?.trim().length}`);
        throw new Error(`Encryption key must be 32 bytes (base64 encoded). Got ${key.length} bytes.`);
    }

    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

    const encrypted = Buffer.concat([
        cipher.update(text, 'utf8'),
        cipher.final()
    ])

    const authTag = cipher.getAuthTag()

    // Combine IV + AuthTag + EncryptedData
    return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

/**
 * Decrypts a base64 string created by the encrypt function.
 */
export function decrypt(combinedBase64: string, keyBase64: string): string {
    if (!combinedBase64) return ''

    const key = Buffer.from(keyBase64.trim(), 'base64')
    const combined = Buffer.from(combinedBase64.trim(), 'base64')

    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
        throw new Error('Invalid encrypted data format')
    }

    const iv = combined.subarray(0, IV_LENGTH)
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
    ])

    return decrypted.toString('utf8')
}
