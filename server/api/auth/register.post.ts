import { User } from '../../models/User'
import { hashPassword, generateVerificationCode } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name, email, password, confirmPassword } = body

  if (!name || !email || !password) {
    throw createError({ statusCode: 400, message: 'Name, email, and password are required' })
  }

  if (password !== confirmPassword) {
    throw createError({ statusCode: 400, message: 'Passwords do not match' })
  }

  if (password.length < 6) {
    throw createError({ statusCode: 400, message: 'Password must be at least 6 characters' })
  }

  // Check if user exists
  const existingUser = await User.findOne({ email: email.toLowerCase().trim() })
  if (existingUser) {
    throw createError({ statusCode: 409, message: 'An account with this email already exists' })
  }

  // Generate verification code
  const verificationCode = generateVerificationCode()
  const verificationExpiry = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

  // Create user
  const hashedPassword = hashPassword(password)
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    provider: 'email',
    emailVerified: false,
    emailVerificationCode: verificationCode,
    emailVerificationExpiry: verificationExpiry,
    approvalStatus: 'pending',
  })

  // In production, send email with verification code
  // For dev, log the code to console
  console.log(`[Auth] Verification code for ${email}: ${verificationCode}`)

  return {
    success: true,
    email: user.email,
    verificationCode, // Only in dev — remove for production
    message: 'Registration successful! Please verify your email.',
  }
})
