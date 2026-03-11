import { User } from '../../models/User'
import { getUserSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  // Verify admin session
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const token = authHeader.slice(7)
  const session = getUserSession(token)
  if (!session || session.role !== 'super_admin') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const body = await readBody(event)
  const { userId, action, role, reason } = body

  if (!userId || !action) {
    throw createError({ statusCode: 400, message: 'userId and action are required' })
  }

  // Prevent admins from modifying themselves
  if (userId === session.userId) {
    throw createError({ statusCode: 400, message: 'You cannot modify your own account' })
  }

  const user = await User.findById(userId)
  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  // Prevent modifying other super_admins
  if (user.role === 'super_admin') {
    throw createError({ statusCode: 403, message: 'Cannot modify another super admin' })
  }

  switch (action) {
    case 'change_role': {
      if (!role || !['user', 'super_admin'].includes(role)) {
        throw createError({ statusCode: 400, message: 'Valid role is required' })
      }
      user.role = role
      await user.save()
      return {
        success: true,
        message: `${user.name}'s role changed to ${role === 'super_admin' ? 'Super Admin' : 'User'}.`,
      }
    }

    case 'reject': {
      user.approvalStatus = 'rejected'
      user.rejectedReason = reason || 'Account revoked by administrator'
      await user.save()
      return {
        success: true,
        message: `${user.name}'s access has been revoked.`,
      }
    }

    case 'reapprove': {
      user.approvalStatus = 'approved'
      user.rejectedReason = undefined
      user.approvedBy = session.email
      user.approvedAt = new Date()
      await user.save()
      return {
        success: true,
        message: `${user.name} has been re-approved.`,
      }
    }

    case 'delete': {
      await User.findByIdAndDelete(userId)
      return {
        success: true,
        message: `${user.name}'s account has been permanently deleted.`,
      }
    }

    default:
      throw createError({ statusCode: 400, message: `Unknown action: ${action}` })
  }
})
