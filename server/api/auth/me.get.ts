import { User } from '../../models/User'
import { getUserSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { success: false, valid: false, message: 'Unauthorized' }
  }

  const token = authHeader.slice(7)
  const session = getUserSession(token)
  if (!session) {
    return { success: false, valid: false, message: 'Session expired' }
  }

  const user = await User.findById(session.userId).select('-password -emailVerificationCode -resetPasswordCode')
  if (!user) {
    return { success: false, valid: false, message: 'Account not found', forceLogout: true }
  }

  // Force logout if user has been rejected or deactivated
  if (user.role !== 'super_admin' && (user.approvalStatus === 'rejected' || !user.isActive)) {
    throw createError({
      statusCode: 403,
      message: user.approvalStatus === 'rejected'
        ? 'Your account access has been revoked.'
        : 'Your account has been deactivated.',
      data: { forceLogout: true },
    })
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
