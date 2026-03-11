export default defineNuxtRouteMiddleware((to) => {
  // Public routes that don't require authentication
  const publicRoutes = [
    '/login',
    '/login-basic',
    '/register',
    '/forgot-password',
    '/verify-email',
    '/pending-approval',
    '/otp',
    '/otp-1',
    '/otp-2',
    '/culture-gourmet-customer-portal',
  ]

  // Auth-only routes (redirect authenticated users away from these)
  const authOnlyRoutes = ['/login', '/login-basic', '/register']

  // Check if the route is public
  const isPublic = publicRoutes.some(route => to.path === route)
    || to.path.startsWith('/external') // all /external/* routes are public

  // On the client, check localStorage for auth
  if (import.meta.client) {
    const token = localStorage.getItem('cg_auth_token')
    const user = localStorage.getItem('cg_auth_user')
    const isLoggedIn = !!token && !!user

    // If logged in and trying to access auth pages, redirect to dashboard
    if (isLoggedIn && authOnlyRoutes.some(route => to.path === route)) {
      return navigateTo('/')
    }

    // If NOT logged in and trying to access protected page, redirect to login
    if (!isLoggedIn && !isPublic) {
      return navigateTo('/login')
    }
  }
})
