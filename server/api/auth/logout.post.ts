import { deleteSession, getSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    deleteSession(token)
  }

  return { success: true, message: 'Logged out successfully' }
})
