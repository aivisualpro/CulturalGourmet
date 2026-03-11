import { User } from '../../models/User'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, code } = body

  if (!email || !code) {
    throw createError({ statusCode: 400, message: 'Email and verification code are required' })
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() })
  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  if (user.emailVerified) {
    return { success: true, alreadyVerified: true, message: 'Email is already verified.' }
  }

  if (user.emailVerificationCode !== code) {
    throw createError({ statusCode: 400, message: 'Invalid verification code' })
  }

  if (user.emailVerificationExpiry && new Date() > user.emailVerificationExpiry) {
    throw createError({ statusCode: 400, message: 'Verification code has expired. Please request a new one.' })
  }

  user.emailVerified = true
  user.emailVerificationCode = undefined
  user.emailVerificationExpiry = undefined
  await user.save()

  return {
    success: true,
    message: 'Email verified successfully! Your account is now pending admin approval.',
    approvalStatus: user.approvalStatus,
  }
})
