import { User } from '../../models/User'
import { getSession } from '../../utils/auth'

/**
 * Real-time notification polling for pending registrations
 * Returns count and recent pending users for desktop notification triggers
 */
export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const token = authHeader.slice(7)
  const session = getSession(token)
  if (!session || session.role !== 'super_admin') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const query = getQuery(event)
  const since = query.since ? new Date(query.since as string) : new Date(Date.now() - 24 * 60 * 60 * 1000)

  const pendingUsers = await User.find({
    approvalStatus: 'pending',
    emailVerified: true,
    role: { $ne: 'super_admin' },
    createdAt: { $gte: since },
  })
    .select('name email createdAt avatar')
    .sort({ createdAt: -1 })

  const totalPending = await User.countDocuments({
    approvalStatus: 'pending',
    emailVerified: true,
    role: { $ne: 'super_admin' },
  })

  return {
    success: true,
    pendingUsers,
    totalPending,
    newCount: pendingUsers.length,
  }
})
