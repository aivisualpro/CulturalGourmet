import { getSession } from '../utils/auth'

export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  const path = url.pathname

  // Skip auth check for public API routes
  if (
    path.startsWith('/api/auth/')
    || path.startsWith('/api/admin/') // admin endpoints already check auth headers internally
    || !path.startsWith('/api/')      // non-API routes (pages, assets)
  ) {
    return
  }

  // Check for Authorization header
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Authentication required',
    })
  }

  const token = authHeader.replace('Bearer ', '')
  const session = getSession(token)
  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Invalid or expired session',
    })
  }

  // Attach session to event context for use in handlers
  event.context.auth = session
})
