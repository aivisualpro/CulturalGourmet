import { User } from '../../models/User'
import { getSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const token = authHeader.slice(7)
  const session = getSession(token)
  if (!session) {
    throw createError({ statusCode: 401, message: 'Session expired' })
  }

  const user = await User.findById(session.userId).select('-password -emailVerificationCode -resetPasswordCode')
  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  return {
    success: true,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      provider: user.provider,
      approvalStatus: user.approvalStatus,
      emailVerified: user.emailVerified,
    },
  }
})
