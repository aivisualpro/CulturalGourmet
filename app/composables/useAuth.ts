interface AuthUser {
  id: string
  name: string
  email: string
  role: 'user' | 'super_admin'
  avatar: string
  provider: 'email' | 'google'
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isAdmin: boolean
  isLoading: boolean
}

const AUTH_TOKEN_KEY = 'cg_auth_token'
const AUTH_USER_KEY = 'cg_auth_user'

export function useAuth() {
  const user = useState<AuthUser | null>('auth_user', () => null)
  const token = useState<string | null>('auth_token', () => null)
  const isLoading = useState('auth_loading', () => false)

  const isAuthenticated = computed(() => !!user.value && !!token.value)
  const isAdmin = computed(() => user.value?.role === 'super_admin')

  // Init from localStorage
  function initAuth() {
    if (import.meta.client) {
      const savedToken = localStorage.getItem(AUTH_TOKEN_KEY)
      const savedUser = localStorage.getItem(AUTH_USER_KEY)
      if (savedToken && savedUser) {
        token.value = savedToken
        try {
          user.value = JSON.parse(savedUser)
        }
        catch {
          logout()
        }
      }
    }
  }

  function setAuth(authToken: string, authUser: AuthUser) {
    token.value = authToken
    user.value = authUser
    if (import.meta.client) {
      localStorage.setItem(AUTH_TOKEN_KEY, authToken)
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(authUser))
    }
  }

  function logout() {
    if (token.value) {
      $fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token.value}` },
      }).catch(() => {})
    }
    token.value = null
    user.value = null

    // Clear global data cache
    try { useDataStore().reset() } catch {}

    if (import.meta.client) {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      localStorage.removeItem(AUTH_USER_KEY)
    }
    navigateTo('/login')
  }

  async function loginWithEmail(email: string, password: string) {
    isLoading.value = true
    try {
      const res = await $fetch<any>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      })

      if (res.requiresVerification) {
        return { success: false, requiresVerification: true, email: res.email }
      }

      if (res.pendingApproval) {
        return { success: false, pendingApproval: true, message: res.message }
      }

      if (res.rejected) {
        return { success: false, rejected: true, message: res.message }
      }

      if (res.success && res.token) {
        setAuth(res.token, res.user)
        return { success: true }
      }

      return { success: false, message: 'Login failed' }
    }
    catch (err: any) {
      const message = err?.data?.message || err?.message || 'Login failed'
      return { success: false, message }
    }
    finally {
      isLoading.value = false
    }
  }

  async function loginWithGoogle(credential: string) {
    isLoading.value = true
    try {
      const res = await $fetch<any>('/api/auth/google', {
        method: 'POST',
        body: { credential },
      })

      if (res.pendingApproval) {
        return { success: false, pendingApproval: true, message: res.message, email: res.email, name: res.name }
      }

      if (res.rejected) {
        return { success: false, rejected: true, message: res.message }
      }

      if (res.success && res.token) {
        setAuth(res.token, res.user)
        return { success: true }
      }

      return { success: false, message: 'Google login failed' }
    }
    catch (err: any) {
      const message = err?.data?.message || err?.message || 'Google login failed'
      return { success: false, message }
    }
    finally {
      isLoading.value = false
    }
  }

  async function register(data: { name: string, email: string, password: string, confirmPassword: string }) {
    isLoading.value = true
    try {
      const res = await $fetch<any>('/api/auth/register', {
        method: 'POST',
        body: data,
      })
      return res
    }
    catch (err: any) {
      const message = err?.data?.message || err?.message || 'Registration failed'
      throw new Error(message)
    }
    finally {
      isLoading.value = false
    }
  }

  async function verifyEmail(email: string, code: string) {
    isLoading.value = true
    try {
      const res = await $fetch<any>('/api/auth/verify-email', {
        method: 'POST',
        body: { email, code },
      })
      return res
    }
    catch (err: any) {
      const message = err?.data?.message || err?.message || 'Verification failed'
      throw new Error(message)
    }
    finally {
      isLoading.value = false
    }
  }

  async function resendCode(email: string) {
    try {
      const res = await $fetch<any>('/api/auth/resend-code', {
        method: 'POST',
        body: { email },
      })
      return res
    }
    catch (err: any) {
      const message = err?.data?.message || err?.message || 'Failed to resend code'
      throw new Error(message)
    }
  }

  async function checkStatus(email: string) {
    try {
      return await $fetch<any>('/api/auth/check-status', { query: { email } })
    }
    catch {
      return null
    }
  }

  // Admin functions
  async function fetchPendingUsers(status = 'pending') {
    if (!token.value) return null
    try {
      return await $fetch<any>('/api/admin/users', {
        headers: { Authorization: `Bearer ${token.value}` },
        query: { status },
      })
    }
    catch {
      return null
    }
  }

  async function approveUser(userId: string, action: 'approve' | 'reject', reason?: string) {
    if (!token.value) return null
    try {
      return await $fetch<any>('/api/admin/approve-user', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token.value}` },
        body: { userId, action, reason },
      })
    }
    catch (err: any) {
      throw new Error(err?.data?.message || 'Action failed')
    }
  }


  async function updateUser(userId: string, action: string, data?: { role?: string, reason?: string }) {
    if (!token.value) return null
    try {
      return await $fetch<any>('/api/admin/update-user', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token.value}` },
        body: { userId, action, ...data },
      })
    }
    catch (err: any) {
      throw new Error(err?.data?.message || 'Action failed')
    }
  }

  async function deleteUser(userId: string) {
    return updateUser(userId, 'delete')
  }

  async function validateSession(): Promise<boolean> {
    if (!token.value) return false
    try {
      const res = await $fetch<any>('/api/auth/me', {
        headers: { Authorization: `Bearer ${token.value}` },
      })
      // Update user state from server
      if (res?.user) {
        user.value = res.user
      }
      return true
    }
    catch (err: any) {
      const data = err?.data?.data || err?.data
      if (data?.forceLogout || err?.statusCode === 403 || err?.status === 403) {
        // User has been rejected/deleted — force logout
        token.value = null
        user.value = null
        if (import.meta.client) {
          localStorage.removeItem(AUTH_TOKEN_KEY)
          localStorage.removeItem(AUTH_USER_KEY)
          window.location.href = '/login?reason=revoked'
        }
        return false
      }
      return false
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    isAdmin,
    isLoading,
    initAuth,
    setAuth,
    logout,
    loginWithEmail,
    loginWithGoogle,
    register,
    verifyEmail,
    resendCode,
    checkStatus,
    fetchPendingUsers,
    approveUser,
    updateUser,
    deleteUser,
    validateSession,
  }
}
