import { User } from '../../models/User'
import { generateVerificationCode } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email } = body

  if (!email) {
    throw createError({ statusCode: 400, message: 'Email is required' })
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() })
  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  if (user.emailVerified) {
    return { success: true, alreadyVerified: true, message: 'Email is already verified.' }
  }

  // Generate new verification code
  const verificationCode = generateVerificationCode()
  user.emailVerificationCode = verificationCode
  user.emailVerificationExpiry = new Date(Date.now() + 15 * 60 * 1000)
  await user.save()

  // In production, send email here
  console.log(`[Auth] New verification code for ${email}: ${verificationCode}`)

  return {
    success: true,
    verificationCode, // Dev only
    message: 'A new verification code has been sent to your email.',
  }
})
