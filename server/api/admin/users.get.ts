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

  const query = getQuery(event)
  const status = query.status as string || 'pending'

  const filter: Record<string, any> = {}
  if (status === 'all') {
    // Show everyone including admins
  }
  else {
    filter.role = { $ne: 'super_admin' }
    filter.approvalStatus = status
  }

  const users = await User.find(filter)
    .select('-password -emailVerificationCode -resetPasswordCode')
    .sort({ createdAt: -1 })

  return {
    success: true,
    users,
    count: users.length,
  }
})
