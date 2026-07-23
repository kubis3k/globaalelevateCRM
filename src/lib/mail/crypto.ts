import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

// AES-256-GCM pro hesla e-mailových schránek. Formát: base64( iv(12) | tag(16) | ciphertext ).
//
// Klíč je oddělen od SUPABASE_SERVICE_ROLE_KEY (viz docs/adr/0003):
//  - PRIMÁRNÍ: MAIL_ENCRYPTION_KEY (dedikovaný secret). Rotace service-role
//    klíče tak nezničí uložená hesla.
//  - LEGACY (fallback při dešifrování): odvozený ze SUPABASE_SERVICE_ROLE_KEY —
//    kvůli datům zašifrovaným před zavedením MAIL_ENCRYPTION_KEY.
//
// Migrace bez zásahu do dat: dešifrování zkusí primární klíč a při selhání
// legacy klíč. Nové/uložené účty se šifrují primárním klíčem, takže data
// postupně „přemigrují" samovolně při každém uložení schránky. Dokud není
// MAIL_ENCRYPTION_KEY nastaven, primární = legacy (plná zpětná kompatibilita).

const SALT = 'mail-account-secret-v1'

function deriveKey(material: string): Buffer {
  return scryptSync(material, SALT, 32)
}

let primaryKey: Buffer | null = null
let legacyKey: Buffer | null = null

function getPrimaryKey(): Buffer {
  if (!primaryKey) {
    const material = process.env.MAIL_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-fallback-key'
    primaryKey = deriveKey(material)
  }
  return primaryKey
}

// Legacy klíč existuje jen pokud je nastaven zvlášť MAIL_ENCRYPTION_KEY
// (jinak by byl identický s primárním).
function getLegacyKey(): Buffer | null {
  if (!process.env.MAIL_ENCRYPTION_KEY) return null
  if (!legacyKey) {
    legacyKey = deriveKey(process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-fallback-key')
  }
  return legacyKey
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getPrimaryKey(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64')
}

function decryptWith(key: Buffer, iv: Buffer, tag: Buffer, data: Buffer): string {
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

export function decryptSecret(b64: string): string {
  const buf = Buffer.from(b64, 'base64')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const data = buf.subarray(28)
  try {
    return decryptWith(getPrimaryKey(), iv, tag, data)
  } catch (e) {
    const legacy = getLegacyKey()
    if (legacy) return decryptWith(legacy, iv, tag, data) // data z doby před MAIL_ENCRYPTION_KEY
    throw e
  }
}
