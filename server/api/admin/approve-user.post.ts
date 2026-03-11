import { User } from '../../models/User'
import { getSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  // Verify admin session
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const token = authHeader.slice(7)
  const session = getSession(token)
  if (!session || session.role !== 'super_admin') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const body = await readBody(event)
  const { userId, action, reason } = body

  if (!userId || !action) {
    throw createError({ statusCode: 400, message: 'userId and action are required' })
  }

  if (!['approve', 'reject'].includes(action)) {
    throw createError({ statusCode: 400, message: 'Action must be "approve" or "reject"' })
  }

  const user = await User.findById(userId)
  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  if (action === 'approve') {
    user.approvalStatus = 'approved'
    user.approvedBy = session.email
    user.approvedAt = new Date()
  }
  else {
    user.approvalStatus = 'rejected'
    user.rejectedReason = reason || 'Registration declined by administrator'
  }

  await user.save()

  return {
    success: true,
    message: `User ${user.email} has been ${action}d.`,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      approvalStatus: user.approvalStatus,
    },
  }
})
