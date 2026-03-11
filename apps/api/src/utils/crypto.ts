/**
 * pgcrypto-based encryption utilities.
 *
 * We use PostgreSQL's pgcrypto extension to encrypt/decrypt payment
 * gateway credentials at rest.  The encryption key lives ONLY in the
 * API server's environment — it is never stored in the database.
 *
 * Encryption:  pgp_sym_encrypt(plaintext, key)  → bytea
 * Decryption:  pgp_sym_decrypt(ciphertext, key) → text
 *
 * We use Prisma's `$queryRawUnsafe` to call these functions.
 */

import { prisma } from '@mzadat/db'

// ── Environment ─────────────────────────────────────────
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY
  if (!key || key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters')
  }
  return key
}

// ── Encrypt / Decrypt ───────────────────────────────────

/**
 * Encrypt a plaintext string using pgcrypto's PGP symmetric encryption.
 * Returns a Buffer (bytea) that can be stored in a `Bytes` Prisma column.
 */
export async function pgEncrypt(plaintext: string): Promise<Buffer> {
  const key = getEncryptionKey()
  const result = await prisma.$queryRawUnsafe<{ encrypted: Buffer }[]>(
    `SELECT pgp_sym_encrypt($1, $2) AS encrypted`,
    plaintext,
    key,
  )
  return result[0].encrypted
}

/**
 * Decrypt a bytea blob back to plaintext using pgcrypto.
 */
export async function pgDecrypt(encrypted: Buffer): Promise<string> {
  const key = getEncryptionKey()
  const result = await prisma.$queryRawUnsafe<{ decrypted: string }[]>(
    `SELECT pgp_sym_decrypt($1::bytea, $2) AS decrypted`,
    encrypted,
    key,
  )
  return result[0].decrypted
}

// ── JSON helpers ────────────────────────────────────────

/**
 * Encrypt a JSON object.  Serializes to string first, then encrypts.
 */
export async function encryptJson(data: Record<string, unknown>): Promise<Buffer> {
  return pgEncrypt(JSON.stringify(data))
}

/**
 * Decrypt a bytea blob and parse back to a JSON object.
 */
export async function decryptJson<T = Record<string, unknown>>(encrypted: Buffer): Promise<T> {
  const plaintext = await pgDecrypt(encrypted)
  return JSON.parse(plaintext) as T
}
