export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  const { validateSession, isAuthenticated } = useAuth()
  let intervalId: ReturnType<typeof setInterval> | null = null

  // Validate session every 30 seconds
  const SESSION_CHECK_INTERVAL = 30_000

  function startSessionCheck() {
    if (intervalId) return
    intervalId = setInterval(async () => {
      if (isAuthenticated.value) {
        await validateSession()
      }
    }, SESSION_CHECK_INTERVAL)
  }

  function stopSessionCheck() {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  // Start checking when the page becomes visible, stop when hidden
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isAuthenticated.value) {
      // Validate immediately when tab becomes visible
      validateSession()
      startSessionCheck()
    }
    else {
      stopSessionCheck()
    }
  })

  // Initial start
  if (isAuthenticated.value) {
    startSessionCheck()
  }

  // Watch for auth state changes
  watch(isAuthenticated, (val) => {
    if (val) {
      startSessionCheck()
    }
    else {
      stopSessionCheck()
    }
  })
})
