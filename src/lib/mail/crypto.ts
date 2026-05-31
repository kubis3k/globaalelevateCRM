import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

// AES-256-GCM. Key derived from the (already-secret) service-role key — no new
// env var to manage. Format: base64( iv(12) | tag(16) | ciphertext ).
let cachedKey: Buffer | null = null
function key(): Buffer {
  if (!cachedKey) {
    const material = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-fallback-key'
    cachedKey = scryptSync(material, 'mail-account-secret-v1', 32)
  }
  return cachedKey
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64')
}

export function decryptSecret(b64: string): string {
  const buf = Buffer.from(b64, 'base64')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const data = buf.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', key(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}
