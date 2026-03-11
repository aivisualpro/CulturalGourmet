import { User } from '../../models/User'

/**
 * Check approval status for a given email — public endpoint for pending users
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const email = query.email as string

  if (!email) {
    throw createError({ statusCode: 400, message: 'Email is required' })
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() })
    .select('approvalStatus emailVerified name')

  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  return {
    success: true,
    approvalStatus: user.approvalStatus,
    emailVerified: user.emailVerified,
    name: user.name,
  }
})
