<script setup lang="ts">
import { Loader2, ChefHat, Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'blank',
})

useSeoMeta({
  title: 'Login — The Culture Gourmet',
  description: 'Sign in to your Culture Gourmet account',
})

const config = useRuntimeConfig()
const { loginWithEmail, loginWithGoogle, isLoading } = useAuth()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const errorMessage = ref('')
const showPendingModal = ref(false)
const pendingMessage = ref('')
const googleLoading = ref(false)

// Particle animation state
const particles = ref(
  Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 8 + 4,
    delay: Math.random() * 4,
  })),
)

// Google Identity Services
let googleClient: any = null

function loadGoogleScript() {
  return new Promise<void>((resolve) => {
    if (document.getElementById('google-gis-script')) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.id = 'google-gis-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    document.head.appendChild(script)
  })
}

async function initGoogleClient() {
  await loadGoogleScript()
  const clientId = config.public.googleClientId
  if (!clientId) {
    console.warn('[Auth] No Google client ID configured')
    return
  }

  googleClient = (window as any).google?.accounts?.oauth2
    ? null // We use the ID token flow via credential API
    : null

  // Initialize the Google Identity Services credential client
  ;(window as any).google?.accounts?.id?.initialize({
    client_id: clientId,
    callback: handleGoogleCallback,
    auto_select: false,
    cancel_on_tap_outside: true,
  })
}

onMounted(() => {
  initGoogleClient()
})

async function handleEmailLogin() {
  errorMessage.value = ''
  if (!email.value || !password.value) {
    errorMessage.value = 'Please enter your email and password'
    return
  }

  const result = await loginWithEmail(email.value, password.value)

  if (result.success) {
    toast.success('Welcome back!', { description: 'Redirecting to dashboard...' })
    setTimeout(() => navigateTo('/'), 500)
  }
  else if (result.requiresVerification) {
    navigateTo(`/verify-email?email=${encodeURIComponent(result.email!)}`)
  }
  else if (result.pendingApproval) {
    showPendingModal.value = true
    pendingMessage.value = result.message || 'Your account is pending approval.'
  }
  else if (result.rejected) {
    errorMessage.value = result.message || 'Your account has been declined.'
  }
  else {
    errorMessage.value = result.message || 'Login failed. Please try again.'
  }
}

function handleGoogleLogin() {
  errorMessage.value = ''
  // Use the Google One Tap / prompt flow
  const google = (window as any).google
  if (!google?.accounts?.id) {
    errorMessage.value = 'Google Sign-In is not available. Please try again.'
    return
  }
  google.accounts.id.prompt()
}

async function handleGoogleCallback(response: any) {
  if (!response?.credential) {
    errorMessage.value = 'Google Sign-In was cancelled.'
    return
  }

  googleLoading.value = true
  errorMessage.value = ''

  const result = await loginWithGoogle(response.credential)

  googleLoading.value = false

  if (result.success) {
    toast.success('Welcome!', { description: 'Signed in with Google' })
    setTimeout(() => navigateTo('/'), 500)
  }
  else if (result.pendingApproval) {
    showPendingModal.value = true
    pendingMessage.value = result.message || 'Your account is pending approval.'
  }
  else if (result.rejected) {
    errorMessage.value = result.message || 'Your account has been declined.'
  }
  else {
    errorMessage.value = result.message || 'Google login failed'
  }
}
</script>

<template>
  <div class="login-page">
    <!-- Animated background -->
    <div class="animated-bg">
      <div class="gradient-orb orb-1" />
      <div class="gradient-orb orb-2" />
      <div class="gradient-orb orb-3" />
      <div
        v-for="p in particles"
        :key="p.id"
        class="particle"
        :style="{
          left: `${p.x}%`,
          top: `${p.y}%`,
          width: `${p.size}px`,
          height: `${p.size}px`,
          animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`,
        }"
      />
    </div>

    <!-- Glassmorphism container -->
    <div class="login-container">
      <!-- Left panel - Hero -->
      <div class="hero-panel">
        <div class="hero-content">
          <div class="hero-logo">
            <img
              src="/the culture gourmet logo.png"
              alt="The Culture Gourmet"
              class="logo-img"
            >
          </div>
          <h1 class="hero-title">
            The Culture<br><span class="gradient-text">Gourmet</span>
          </h1>
          <p class="hero-subtitle">
            Where culinary artistry meets cultural excellence. Manage your gourmet empire with style.
          </p>
        </div>
        <div class="hero-overlay" />
      </div>

      <!-- Right panel - Login form -->
      <div class="form-panel">
        <div class="form-wrapper">
          <!-- Mobile logo -->
          <div class="mobile-logo">
            <img
              src="/the culture gourmet logo.png"
              alt="The Culture Gourmet"
              class="mobile-logo-img"
            >
          </div>

          <div class="form-header">
            <h2 class="form-title">
              Welcome Back
            </h2>
            <p class="form-subtitle">
              Sign in to access your dashboard
            </p>
          </div>

          <!-- Error message -->
          <Transition name="shake">
            <div v-if="errorMessage" class="error-banner">
              <Icon name="i-lucide-alert-circle" class="w-4 h-4 flex-shrink-0" />
              <span>{{ errorMessage }}</span>
            </div>
          </Transition>

          <!-- Google login -->
          <button
            class="google-btn"
            :disabled="isLoading"
            @click="handleGoogleLogin"
          >
            <svg viewBox="0 0 24 24" class="w-5 h-5">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <!-- Divider -->
          <div class="auth-divider">
            <span>or sign in with email</span>
          </div>

          <!-- Email / Password form -->
          <form class="login-form" @submit.prevent="handleEmailLogin">
            <div class="input-group">
              <label for="login-email" class="input-label">Email Address</label>
              <div class="input-wrapper">
                <Mail class="input-icon" />
                <input
                  id="login-email"
                  v-model="email"
                  type="email"
                  placeholder="you@example.com"
                  class="auth-input"
                  :disabled="isLoading"
                  autocomplete="email"
                >
              </div>
            </div>

            <div class="input-group">
              <div class="label-row">
                <label for="login-password" class="input-label">Password</label>
                <NuxtLink to="/forgot-password" class="forgot-link">
                  Forgot password?
                </NuxtLink>
              </div>
              <div class="input-wrapper">
                <Lock class="input-icon" />
                <input
                  id="login-password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Enter your password"
                  class="auth-input"
                  :disabled="isLoading"
                  autocomplete="current-password"
                >
                <button
                  type="button"
                  class="toggle-password"
                  @click="showPassword = !showPassword"
                >
                  <Eye v-if="showPassword" class="w-4 h-4" />
                  <EyeOff v-else class="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              type="submit"
              class="submit-btn"
              :disabled="isLoading"
            >
              <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin" />
              <span>Sign In</span>
              <ArrowRight v-if="!isLoading" class="w-4 h-4 btn-arrow" />
            </button>
          </form>

          <!-- Register link -->
          <p class="register-prompt">
            Don't have an account?
            <NuxtLink to="/register" class="register-link">
              Create Account
              <ArrowRight class="w-3 h-3 inline-block" />
            </NuxtLink>
          </p>
        </div>
      </div>
    </div>

    <!-- Pending Approval Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showPendingModal" class="modal-overlay" @click.self="showPendingModal = false">
          <div class="modal-card">
            <div class="modal-icon pending-icon">
              <Icon name="i-lucide-clock" class="w-8 h-8" />
            </div>
            <h3 class="modal-title">
              Approval Pending
            </h3>
            <p class="modal-message">
              {{ pendingMessage }}
            </p>
            <p class="modal-hint">
              You'll receive a notification once an admin reviews your account.
            </p>
            <button class="modal-btn" @click="showPendingModal = false">
              Got it
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: #0a0a0f;
  padding: 1rem;
}

/* Animated background */
.animated-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
  animation: orbFloat 12s ease-in-out infinite;
}

.orb-1 {
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  top: -10%;
  left: -5%;
  animation-delay: 0s;
}

.orb-2 {
  width: 350px;
  height: 350px;
  background: linear-gradient(135deg, #f093fb, #f5576c);
  bottom: -10%;
  right: -5%;
  animation-delay: -4s;
}

.orb-3 {
  width: 300px;
  height: 300px;
  background: linear-gradient(135deg, #4facfe, #00f2fe);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: -8s;
}

@keyframes orbFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(30px, -30px) scale(1.1); }
  50% { transform: translate(-20px, 20px) scale(0.9); }
  75% { transform: translate(20px, 30px) scale(1.05); }
}

.particle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  animation: particleFloat 10s ease-in-out infinite;
}

@keyframes particleFloat {
  0%, 100% { transform: translateY(0) translateX(0); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  50% { transform: translateY(-40px) translateX(20px); }
}

/* Login container */
.login-container {
  position: relative;
  z-index: 10;
  display: flex;
  width: 100%;
  max-width: 1000px;
  min-height: 640px;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(20px);
}

/* Hero panel */
.hero-panel {
  flex: 1;
  position: relative;
  display: none;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 3rem;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  overflow: hidden;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 70%, rgba(102, 126, 234, 0.15), transparent 60%),
    radial-gradient(circle at 80% 20%, rgba(240, 147, 251, 0.1), transparent 50%);
  pointer-events: none;
}

.hero-content {
  position: relative;
  z-index: 2;
  text-align: center;
}

.brand-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border-radius: 100px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 2rem;
}

.hero-logo {
  margin-bottom: 2rem;
  display: flex;
  justify-content: center;
}

.logo-img {
  width: 140px;
  height: 140px;
  object-fit: contain;
  border-radius: 28px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
}

.hero-title {
  font-size: 2.5rem;
  font-weight: 800;
  color: #fff;
  line-height: 1.15;
  margin-bottom: 1rem;
  letter-spacing: -0.02em;
}

.gradient-text {
  background: linear-gradient(135deg, #667eea, #f093fb, #4facfe);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.95rem;
  line-height: 1.6;
  max-width: 320px;
  margin: 0 auto 2rem;
}

.hero-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding: 1.25rem 2rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
}

.stat-label {
  display: block;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-top: 2px;
}

.stat-divider {
  width: 1px;
  height: 32px;
  background: rgba(255, 255, 255, 0.1);
}

/* Form panel */
.form-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2.5rem;
  background: rgba(18, 18, 25, 0.95);
}

.form-wrapper {
  width: 100%;
  max-width: 380px;
}

.mobile-logo {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.mobile-logo-img {
  width: 60px;
  height: 60px;
  object-fit: contain;
  border-radius: 16px;
}

.form-header {
  text-align: center;
  margin-bottom: 1.75rem;
}

.form-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;
}

.form-subtitle {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
  margin-top: 0.375rem;
}

/* Error banner */
.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  font-size: 0.8rem;
  margin-bottom: 1.25rem;
  animation: shakeIn 0.3s ease;
}

@keyframes shakeIn {
  0% { transform: translateX(-8px); opacity: 0; }
  50% { transform: translateX(4px); }
  100% { transform: translateX(0); opacity: 1; }
}

/* Google button */
.google-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.google-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.google-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Divider */
.auth-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 1.5rem 0;
}

.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
}

.auth-divider span {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.35);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

/* Login form */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.forgot-link {
  font-size: 0.75rem;
  color: #667eea;
  text-decoration: none;
  transition: color 0.2s;
}

.forgot-link:hover {
  color: #8b9cf7;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  width: 16px;
  height: 16px;
  color: rgba(255, 255, 255, 0.3);
  transition: color 0.2s;
  pointer-events: none;
  z-index: 1;
}

.auth-input {
  width: 100%;
  padding: 12px 14px 12px 42px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  outline: none;
}

.auth-input::placeholder {
  color: rgba(255, 255, 255, 0.25);
}

.auth-input:focus {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(102, 126, 234, 0.5);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.auth-input:focus + .input-icon,
.input-wrapper:focus-within .input-icon {
  color: #667eea;
}

.toggle-password {
  position: absolute;
  right: 12px;
  padding: 4px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: color 0.2s;
  z-index: 1;
}

.toggle-password:hover {
  color: rgba(255, 255, 255, 0.6);
}

/* Submit button */
.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 13px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 0.25rem;
  position: relative;
  overflow: hidden;
}

.submit-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #764ba2, #667eea);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.submit-btn:hover:not(:disabled)::before {
  opacity: 1;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.35);
}

.submit-btn:hover:not(:disabled) .btn-arrow {
  transform: translateX(3px);
}

.submit-btn > * {
  position: relative;
  z-index: 1;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-arrow {
  transition: transform 0.2s ease;
}

/* Register prompt */
.register-prompt {
  text-align: center;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 1.5rem;
}

.register-link {
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
  margin-left: 4px;
  transition: all 0.2s;
}

.register-link:hover {
  color: #8b9cf7;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  padding: 1rem;
}

.modal-card {
  background: #1a1a2e;
  border-radius: 20px;
  padding: 2.5rem;
  max-width: 400px;
  width: 100%;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
}

.modal-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 16px;
  margin-bottom: 1.25rem;
}

.pending-icon {
  background: rgba(251, 191, 36, 0.1);
  color: #fbbf24;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 0.75rem;
}

.modal-message {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.875rem;
  line-height: 1.6;
  margin-bottom: 0.5rem;
}

.modal-hint {
  color: rgba(255, 255, 255, 0.35);
  font-size: 0.75rem;
  margin-bottom: 1.5rem;
}

.modal-btn {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-card {
  animation: modalSlideUp 0.3s ease;
}

@keyframes modalSlideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Responsive */
@media (min-width: 768px) {
  .hero-panel {
    display: flex;
  }

  .mobile-logo {
    display: none;
  }

  .form-panel {
    padding: 3rem;
  }
}

@media (min-width: 1024px) {
  .login-container {
    min-height: 680px;
  }
}

/* Light mode support */
:root:not(.dark) .login-page {
  background: #f0f2f5;
}

:root:not(.dark) .form-panel {
  background: rgba(255, 255, 255, 0.97);
}

:root:not(.dark) .form-title {
  color: #1a1a2e;
}

:root:not(.dark) .form-subtitle {
  color: #6b7280;
}

:root:not(.dark) .input-label {
  color: #374151;
}

:root:not(.dark) .auth-input {
  background: #f9fafb;
  border-color: #e5e7eb;
  color: #111827;
}

:root:not(.dark) .auth-input::placeholder {
  color: #9ca3af;
}

:root:not(.dark) .auth-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  background: #fff;
}

:root:not(.dark) .google-btn {
  background: #fff;
  border-color: #e5e7eb;
  color: #374151;
}

:root:not(.dark) .google-btn:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #d1d5db;
}

:root:not(.dark) .auth-divider span {
  color: #9ca3af;
}

:root:not(.dark) .auth-divider::before,
:root:not(.dark) .auth-divider::after {
  background: #e5e7eb;
}

:root:not(.dark) .register-prompt {
  color: #6b7280;
}

:root:not(.dark) .input-icon {
  color: #9ca3af;
}

:root:not(.dark) .toggle-password {
  color: #9ca3af;
}

:root:not(.dark) .error-banner {
  background: rgba(239, 68, 68, 0.05);
  border-color: rgba(239, 68, 68, 0.15);
  color: #dc2626;
}
</style>
