import { User } from '../../models/User'
import { createSession } from '../../utils/auth'

/**
 * Google Sign-In handler
 * Receives the Google ID token credential from the client,
 * verifies it with Google's tokeninfo endpoint, then creates/updates the user.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { credential } = body

  if (!credential) {
    throw createError({ statusCode: 400, message: 'Google credential is required' })
  }

  // Verify the Google ID token via Google's tokeninfo endpoint
  let googleUser: { email: string, name: string, sub: string, picture: string, email_verified: boolean }

  try {
    const tokenInfo = await $fetch<any>(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`)

    const config = useRuntimeConfig()
    // Verify the audience matches our client ID
    if (tokenInfo.aud !== config.googleClientId) {
      throw createError({ statusCode: 401, message: 'Invalid Google token audience' })
    }

    googleUser = {
      email: tokenInfo.email,
      name: tokenInfo.name || tokenInfo.email.split('@')[0],
      sub: tokenInfo.sub,
      picture: tokenInfo.picture || '',
      email_verified: tokenInfo.email_verified === 'true',
    }
  }
  catch (err: any) {
    if (err.statusCode) throw err
    console.error('[Auth/Google] Token verification failed:', err)
    throw createError({ statusCode: 401, message: 'Invalid Google credential' })
  }

  let user = await User.findOne({ email: googleUser.email.toLowerCase().trim() })

  if (user) {
    // Existing user — update Google info if needed
    if (!user.googleId) {
      user.googleId = googleUser.sub
    }
    if (!user.provider || user.provider === 'email') {
      user.provider = 'google'
    }
    if (googleUser.picture && !user.avatar) {
      user.avatar = googleUser.picture
    }
    user.emailVerified = true // Google emails are verified
    user.lastLoginAt = new Date()
    await user.save()
  }
  else {
    // New user via Google — create account
    user = await User.create({
      name: googleUser.name,
      email: googleUser.email.toLowerCase().trim(),
      provider: 'google',
      googleId: googleUser.sub,
      avatar: googleUser.picture,
      emailVerified: true,
      approvalStatus: 'pending',
    })
  }

  // Check approval (super admins bypass)
  if (user.role !== 'super_admin' && user.approvalStatus === 'pending') {
    return {
      success: false,
      pendingApproval: true,
      email: user.email,
      name: user.name,
      message: 'Your account is pending approval from an administrator.',
    }
  }

  if (user.role !== 'super_admin' && user.approvalStatus === 'rejected') {
    return {
      success: false,
      rejected: true,
      message: user.rejectedReason || 'Your registration has been declined.',
    }
  }

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
