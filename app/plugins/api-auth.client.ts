export default defineNuxtPlugin(() => {
  const AUTH_TOKEN_KEY = 'cg_auth_token'

  globalThis.$fetch = $fetch.create({
    onRequest({ options }) {
      // Only add auth header for internal API calls
      if (import.meta.client) {
        const token = localStorage.getItem(AUTH_TOKEN_KEY)
        if (token) {
          const headers = options.headers ||= {}
          if (Array.isArray(headers)) {
            headers.push(['Authorization', `Bearer ${token}`])
          }
          else if (headers instanceof Headers) {
            headers.set('Authorization', `Bearer ${token}`)
          }
          else {
            (headers as Record<string, string>).Authorization = `Bearer ${token}`
          }
        }
      }
    },
    onResponseError({ response }) {
      // If we get a 401, redirect to login
      if (response.status === 401 && import.meta.client) {
        localStorage.removeItem(AUTH_TOKEN_KEY)
        localStorage.removeItem('cg_auth_user')
        window.location.href = '/login'
      }
    },
  }) as typeof $fetch
})
