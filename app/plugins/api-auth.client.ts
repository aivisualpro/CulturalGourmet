export default defineNuxtPlugin(() => {
  const AUTH_TOKEN_KEY = 'cg_auth_token'

  globalThis.$fetch = $fetch.create({
    onRequest({ options }) {
      // Only add auth header on client-side for internal API calls
      if (import.meta.client) {
        const token = localStorage.getItem(AUTH_TOKEN_KEY)
        if (token) {
          options.headers = new Headers(options.headers as HeadersInit || {})
          options.headers.set('Authorization', `Bearer ${token}`)
        }
      }
    },
    onResponseError({ response }) {
      // If we get a 401, clear auth and redirect to login
      if (response.status === 401 && import.meta.client) {
        localStorage.removeItem(AUTH_TOKEN_KEY)
        localStorage.removeItem('cg_auth_user')
        window.location.href = '/login'
      }
    },
  }) as typeof $fetch
})
