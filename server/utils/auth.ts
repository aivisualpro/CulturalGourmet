import { createHash, createHmac, randomBytes } from 'node:crypto'

/**
 * Simple password hashing using SHA-256 with salt
 * For production, consider bcrypt — but this avoids native addon issues
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = createHash('sha256').update(salt + password).digest('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  const computed = createHash('sha256').update(salt + password).digest('hex')
  return computed === hash
}

/**
 * Generate a 6-digit verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// ─── Signed Token Sessions (works on serverless / Vercel) ──────
// Instead of in-memory sessions, we encode session data into the token itself
// and sign it with HMAC so it can't be tampered with.

const SECRET = process.env.SESSION_SECRET || 'cg-session-secret-2026-change-in-prod'

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('hex')
}

export function createSession(userId: string, email: string, role: string): string {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
  const payload = JSON.stringify({ userId, email, role, expiresAt })
  const encoded = Buffer.from(payload).toString('base64url')
  const signature = sign(encoded)
  return `${encoded}.${signature}`
}

export function getUserSession(token: string): { userId: string, email: string, role: string, expiresAt: number } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 2) return null

    const [encoded, signature] = parts
    // Verify signature
    const expectedSignature = sign(encoded)
    if (signature !== expectedSignature) return null

    // Decode payload
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString())

    // Check expiration
    if (Date.now() > payload.expiresAt) return null

    return payload
  }
  catch {
    return null
  }
}

export function deleteSession(_token: string) {
  // With signed tokens, deletion is a no-op on the server.
  // The client simply discards the token.
}
