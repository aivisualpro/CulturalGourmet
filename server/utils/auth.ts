import { createHash, randomBytes } from 'node:crypto'

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

/**
 * Generate a simple session token
 */
export function generateSessionToken(): string {
  return randomBytes(48).toString('hex')
}

/**
 * Simple in-memory session store (for dev; replace with Redis or DB in production)
 */
const sessions = new Map<string, { userId: string, email: string, role: string, expiresAt: number }>()

export function createSession(userId: string, email: string, role: string): string {
  const token = generateSessionToken()
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
  sessions.set(token, { userId, email, role, expiresAt })
  return token
}

export function getSession(token: string) {
  const session = sessions.get(token)
  if (!session) return null
  if (Date.now() > session.expiresAt) {
    sessions.delete(token)
    return null
  }
  return session
}

export function deleteSession(token: string) {
  sessions.delete(token)
}
