import { User } from '../../models/User'
import { hashPassword, verifyPassword, createSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password } = body

  if (!email || !password) {
    throw createError({ statusCode: 400, message: 'Email and password are required' })
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() })
  if (!user) {
    throw createError({ statusCode: 401, message: 'Invalid email or password' })
  }

  if (!user.password) {
    throw createError({ statusCode: 401, message: 'This account uses Google sign-in. Please login with Google.' })
  }

  const validPassword = verifyPassword(password, user.password)
  if (!validPassword) {
    throw createError({ statusCode: 401, message: 'Invalid email or password' })
  }

  // Check email verification
  if (!user.emailVerified) {
    return {
      success: false,
      requiresVerification: true,
      email: user.email,
      message: 'Please verify your email address first.',
    }
  }

  // Check approval status
  if (user.role !== 'super_admin' && user.approvalStatus === 'pending') {
    return {
      success: false,
      pendingApproval: true,
      message: 'Your account is pending approval from an administrator. You will receive a notification once approved.',
    }
  }

  if (user.role !== 'super_admin' && user.approvalStatus === 'rejected') {
    return {
      success: false,
      rejected: true,
      message: user.rejectedReason || 'Your registration has been declined.',
    }
  }

  // Update last login
  user.lastLoginAt = new Date()
  await user.save()

  // Create session
  const token = createSession(user._id.toString(), user.email, user.role)

  return {
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      provider: user.provider,
    },
  }
})
