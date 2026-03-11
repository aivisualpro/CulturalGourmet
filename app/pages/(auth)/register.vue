<script setup lang="ts">
import { Loader2, User, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'blank',
})

useSeoMeta({
  title: 'Register — The Culture Gourmet',
  description: 'Create your Culture Gourmet account',
})

const config = useRuntimeConfig()
const { register, loginWithGoogle, isLoading } = useAuth()

// Google Identity Services
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
  if (!clientId) return
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

const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const errorMessage = ref('')
const registrationSuccess = ref(false)
const verificationCode = ref('')

// Password strength
const passwordStrength = computed(() => {
  const p = password.value
  if (!p) return { score: 0, label: '', color: '' }
  let score = 0
  if (p.length >= 6) score++
  if (p.length >= 8) score++
  if (/[A-Z]/.test(p)) score++
  if (/[0-9]/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++

  if (score <= 1) return { score: 1, label: 'Weak', color: '#ef4444' }
  if (score <= 2) return { score: 2, label: 'Fair', color: '#f59e0b' }
  if (score <= 3) return { score: 3, label: 'Good', color: '#3b82f6' }
  if (score <= 4) return { score: 4, label: 'Strong', color: '#22c55e' }
  return { score: 5, label: 'Very Strong', color: '#10b981' }
})

const passwordsMatch = computed(() => {
  if (!confirmPassword.value) return null
  return password.value === confirmPassword.value
})

// Particles
const particles = ref(
  Array.from({ length: 15 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 8 + 4,
    delay: Math.random() * 4,
  })),
)

async function handleRegister() {
  errorMessage.value = ''

  if (!name.value || !email.value || !password.value || !confirmPassword.value) {
    errorMessage.value = 'Please fill in all fields'
    return
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match'
    return
  }

  if (password.value.length < 6) {
    errorMessage.value = 'Password must be at least 6 characters'
    return
  }

  try {
    const result = await register({
      name: name.value,
      email: email.value,
      password: password.value,
      confirmPassword: confirmPassword.value,
    })

    if (result.success) {
      registrationSuccess.value = true
      verificationCode.value = result.verificationCode || ''
      toast.success('Registration successful!', {
        description: 'Please check your email for the verification code.',
      })

      // Redirect to verify email page
      setTimeout(() => {
        navigateTo(`/verify-email?email=${encodeURIComponent(email.value)}&code=${verificationCode.value}`)
      }, 2000)
    }
  }
  catch (err: any) {
    errorMessage.value = err.message || 'Registration failed'
  }
}

function handleGoogleRegister() {
  errorMessage.value = ''
  const google = (window as any).google
  if (!google?.accounts?.id) {
    errorMessage.value = 'Google Sign-In is not available. Please try again.'
    return
  }
  google.accounts.id.prompt()
}

async function handleGoogleCallback(response: any) {
  if (!response?.credential) return

  const result = await loginWithGoogle(response.credential)

  if (result.success) {
    toast.success('Account created!', { description: 'Signed in with Google' })
    setTimeout(() => navigateTo('/'), 500)
  }
  else if (result.pendingApproval) {
    toast.info('Account created!', {
      description: 'Your account is pending admin approval.',
      duration: 5000,
    })
    navigateTo('/pending-approval?email=' + encodeURIComponent(result.email || ''))
  }
  else {
    errorMessage.value = result.message || 'Google registration failed'
  }
}
</script>

<template>
  <div class="register-page">
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

    <!-- Container -->
    <div class="register-container">
      <!-- Left panel - Form -->
      <div class="form-panel">
        <div class="form-wrapper">
          <!-- Mobile logo -->
          <div class="mobile-logo">
            <img src="/the culture gourmet logo.png" alt="The Culture Gourmet" class="mobile-logo-img">
          </div>

          <NuxtLink to="/login" class="back-link">
            <ArrowLeft class="w-4 h-4" />
            <span>Back to Login</span>
          </NuxtLink>

          <div class="form-header">
            <h2 class="form-title">
              Create Account
            </h2>
            <p class="form-subtitle">
              Join The Culture Gourmet community
            </p>
          </div>

          <!-- Success state -->
          <Transition name="fade">
            <div v-if="registrationSuccess" class="success-card">
              <div class="success-icon-wrap">
                <CheckCircle2 class="w-12 h-12 text-emerald-400" />
              </div>
              <h3 class="success-title">
                Registration Successful!
              </h3>
              <p class="success-text">
                We've sent a verification code to <strong>{{ email }}</strong>
              </p>
              <p class="success-hint">
                Redirecting to verification page...
              </p>
              <div v-if="verificationCode" class="dev-code">
                <span class="dev-label">Dev Code:</span>
                <span class="code-value">{{ verificationCode }}</span>
              </div>
            </div>
          </Transition>

          <!-- Registration form -->
          <div v-if="!registrationSuccess">
            <!-- Error -->
            <Transition name="shake">
              <div v-if="errorMessage" class="error-banner">
                <Icon name="i-lucide-alert-circle" class="w-4 h-4 flex-shrink-0" />
                <span>{{ errorMessage }}</span>
              </div>
            </Transition>

            <!-- Google register -->
            <button class="google-btn" :disabled="isLoading" @click="handleGoogleRegister">
              <svg viewBox="0 0 24 24" class="w-5 h-5">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span>Sign up with Google</span>
            </button>

            <div class="auth-divider">
              <span>or register with email</span>
            </div>

            <form class="register-form" @submit.prevent="handleRegister">
              <div class="input-group">
                <label for="register-name" class="input-label">Full Name</label>
                <div class="input-wrapper">
                  <User class="input-icon" />
                  <input
                    id="register-name"
                    v-model="name"
                    type="text"
                    placeholder="John Doe"
                    class="auth-input"
                    :disabled="isLoading"
                    autocomplete="name"
                  >
                </div>
              </div>

              <div class="input-group">
                <label for="register-email" class="input-label">Email Address</label>
                <div class="input-wrapper">
                  <Mail class="input-icon" />
                  <input
                    id="register-email"
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
                <label for="register-password" class="input-label">Password</label>
                <div class="input-wrapper">
                  <Lock class="input-icon" />
                  <input
                    id="register-password"
                    v-model="password"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="Create a strong password"
                    class="auth-input"
                    :disabled="isLoading"
                    autocomplete="new-password"
                  >
                  <button type="button" class="toggle-password" @click="showPassword = !showPassword">
                    <Eye v-if="showPassword" class="w-4 h-4" />
                    <EyeOff v-else class="w-4 h-4" />
                  </button>
                </div>
                <!-- Password strength -->
                <div v-if="password" class="strength-bar">
                  <div class="strength-track">
                    <div
                      class="strength-fill"
                      :style="{ width: `${(passwordStrength.score / 5) * 100}%`, background: passwordStrength.color }"
                    />
                  </div>
                  <span class="strength-label" :style="{ color: passwordStrength.color }">
                    {{ passwordStrength.label }}
                  </span>
                </div>
              </div>

              <div class="input-group">
                <label for="register-confirm" class="input-label">Confirm Password</label>
                <div class="input-wrapper">
                  <Lock class="input-icon" />
                  <input
                    id="register-confirm"
                    v-model="confirmPassword"
                    :type="showConfirmPassword ? 'text' : 'password'"
                    placeholder="Confirm your password"
                    class="auth-input"
                    :class="{ 'input-error': passwordsMatch === false, 'input-success': passwordsMatch === true }"
                    :disabled="isLoading"
                    autocomplete="new-password"
                  >
                  <button type="button" class="toggle-password" @click="showConfirmPassword = !showConfirmPassword">
                    <Eye v-if="showConfirmPassword" class="w-4 h-4" />
                    <EyeOff v-else class="w-4 h-4" />
                  </button>
                </div>
                <span v-if="passwordsMatch === false" class="field-error">Passwords don't match</span>
                <span v-if="passwordsMatch === true" class="field-success">
                  <CheckCircle2 class="w-3 h-3" /> Passwords match
                </span>
              </div>

              <button type="submit" class="submit-btn" :disabled="isLoading">
                <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin" />
                <span>Create Account</span>
                <ArrowRight v-if="!isLoading" class="w-4 h-4 btn-arrow" />
              </button>
            </form>

            <p class="login-prompt">
              Already have an account?
              <NuxtLink to="/login" class="login-link">
                Sign In
                <ArrowRight class="w-3 h-3 inline-block" />
              </NuxtLink>
            </p>

            <p class="terms-text">
              By creating an account, you agree to our
              <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>

      <!-- Right panel - Hero -->
      <div class="hero-panel">
        <div class="hero-content">
          <div class="brand-badge">
            <Sparkles class="w-4 h-4" />
            <span>Join the Community</span>
          </div>
          <div class="hero-logo">
            <img src="/the culture gourmet logo.png" alt="The Culture Gourmet" class="logo-img">
          </div>
          <h1 class="hero-title">
            Start Your<br><span class="gradient-text">Journey</span>
          </h1>
          <p class="hero-subtitle">
            Create your account and unlock the full potential of The Culture Gourmet platform.
          </p>

          <!-- Steps indicator -->
          <div class="steps-list">
            <div class="step-item">
              <div class="step-number active">
                1
              </div>
              <div class="step-info">
                <span class="step-title">Create Account</span>
                <span class="step-desc">Fill in your details</span>
              </div>
            </div>
            <div class="step-connector" />
            <div class="step-item">
              <div class="step-number">
                2
              </div>
              <div class="step-info">
                <span class="step-title">Verify Email</span>
                <span class="step-desc">Confirm your email</span>
              </div>
            </div>
            <div class="step-connector" />
            <div class="step-item">
              <div class="step-number">
                3
              </div>
              <div class="step-info">
                <span class="step-title">Get Approved</span>
                <span class="step-desc">Admin reviews your request</span>
              </div>
            </div>
          </div>
        </div>
        <div class="hero-overlay" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: #0a0a0f;
  padding: 1rem;
}

/* Animated background - same as login */
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
  background: linear-gradient(135deg, #10b981, #3b82f6);
  top: -10%;
  right: -5%;
  animation-delay: 0s;
}

.orb-2 {
  width: 350px;
  height: 350px;
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  bottom: -10%;
  left: -5%;
  animation-delay: -4s;
}

.orb-3 {
  width: 300px;
  height: 300px;
  background: linear-gradient(135deg, #f59e0b, #ef4444);
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

/* Container */
.register-container {
  position: relative;
  z-index: 10;
  display: flex;
  width: 100%;
  max-width: 1000px;
  min-height: 700px;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.06);
}

/* Form panel */
.form-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: rgba(18, 18, 25, 0.95);
  overflow-y: auto;
  max-height: 100vh;
}

.form-wrapper {
  width: 100%;
  max-width: 400px;
  padding: 1rem 0;
}

.mobile-logo {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}

.mobile-logo-img {
  width: 50px;
  height: 50px;
  object-fit: contain;
  border-radius: 14px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8rem;
  text-decoration: none;
  margin-bottom: 1.25rem;
  transition: color 0.2s;
}

.back-link:hover {
  color: #667eea;
}

.form-header {
  margin-bottom: 1.25rem;
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
  margin-top: 0.25rem;
}

/* Success state */
.success-card {
  text-align: center;
  padding: 2rem 0;
}

.success-icon-wrap {
  margin-bottom: 1rem;
  animation: successPulse 1s ease;
}

@keyframes successPulse {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.success-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 0.75rem;
}

.success-text {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.success-text strong {
  color: #fff;
}

.success-hint {
  color: rgba(255, 255, 255, 0.35);
  font-size: 0.75rem;
  margin-bottom: 1rem;
}

.dev-code {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.dev-label {
  font-size: 0.7rem;
  color: rgba(16, 185, 129, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.code-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #10b981;
  font-family: monospace;
  letter-spacing: 0.15em;
}

/* Error banner */
.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  font-size: 0.8rem;
  margin-bottom: 1rem;
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
  padding: 11px;
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
  margin: 1.25rem 0;
}

.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
}

.auth-divider span {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.35);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

/* Form */
.register-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
  pointer-events: none;
  z-index: 1;
  transition: color 0.2s;
}

.auth-input {
  width: 100%;
  padding: 11px 14px 11px 42px;
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

.auth-input.input-error {
  border-color: rgba(239, 68, 68, 0.5);
}

.auth-input.input-success {
  border-color: rgba(16, 185, 129, 0.5);
}

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

/* Strength bar */
.strength-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.strength-track {
  flex: 1;
  height: 3px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.strength-label {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.field-error {
  font-size: 0.7rem;
  color: #fca5a5;
}

.field-success {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  color: #86efac;
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
  background: linear-gradient(135deg, #10b981, #3b82f6);
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
  background: linear-gradient(135deg, #3b82f6, #10b981);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.submit-btn:hover:not(:disabled)::before {
  opacity: 1;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.35);
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

/* Prompts */
.login-prompt {
  text-align: center;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 1.25rem;
}

.login-link {
  color: #10b981;
  text-decoration: none;
  font-weight: 500;
  margin-left: 4px;
  transition: color 0.2s;
}

.login-link:hover {
  color: #34d399;
}

.terms-text {
  text-align: center;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.3);
  margin-top: 1rem;
}

.terms-text a {
  color: rgba(255, 255, 255, 0.5);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.terms-text a:hover {
  color: #fff;
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
  background: linear-gradient(135deg, #0f3460 0%, #16213e 50%, #1a1a2e 100%);
  overflow: hidden;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 70% 30%, rgba(16, 185, 129, 0.12), transparent 60%),
    radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.1), transparent 50%);
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
  margin-bottom: 1.5rem;
}

.logo-img {
  width: 80px;
  height: 80px;
  object-fit: contain;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.hero-title {
  font-size: 2.25rem;
  font-weight: 800;
  color: #fff;
  line-height: 1.15;
  margin-bottom: 1rem;
  letter-spacing: -0.02em;
}

.gradient-text {
  background: linear-gradient(135deg, #10b981, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
  line-height: 1.6;
  max-width: 320px;
  margin: 0 auto 2.5rem;
}

/* Steps */
.steps-list {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
  padding: 1.5rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.step-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.step-number.active {
  background: linear-gradient(135deg, #10b981, #3b82f6);
  color: #fff;
  border: none;
}

.step-info {
  display: flex;
  flex-direction: column;
  text-align: left;
}

.step-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #fff;
}

.step-desc {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
}

.step-connector {
  width: 2px;
  height: 20px;
  background: rgba(255, 255, 255, 0.08);
  margin-left: 15px;
}

/* Responsive */
@media (min-width: 768px) {
  .hero-panel {
    display: flex;
  }

  .mobile-logo {
    display: none;
  }
}

/* Light mode */
:root:not(.dark) .register-page {
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

:root:not(.dark) .back-link {
  color: #6b7280;
}

:root:not(.dark) .back-link:hover {
  color: #667eea;
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

:root:not(.dark) .auth-divider span {
  color: #9ca3af;
}

:root:not(.dark) .auth-divider::before,
:root:not(.dark) .auth-divider::after {
  background: #e5e7eb;
}

:root:not(.dark) .login-prompt {
  color: #6b7280;
}

:root:not(.dark) .input-icon {
  color: #9ca3af;
}

:root:not(.dark) .toggle-password {
  color: #9ca3af;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
