<script setup lang="ts">
import { Loader2, Mail, CheckCircle2, ArrowRight, RotateCcw, Sparkles } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'blank',
})

useSeoMeta({
  title: 'Verify Email — The Culture Gourmet',
  description: 'Verify your email address to continue',
})

const route = useRoute()
const { verifyEmail, resendCode, isLoading } = useAuth()

const email = computed(() => (route.query.email as string) || '')
const devCode = computed(() => (route.query.code as string) || '')
const digits = ref(['', '', '', '', '', ''])
const errorMessage = ref('')
const verified = ref(false)
const resendCooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

// Auto-fill dev code
onMounted(() => {
  if (devCode.value) {
    const chars = devCode.value.split('')
    chars.forEach((c, i) => {
      if (i < 6) digits.value[i] = c
    })
  }
})

function handleInput(index: number, event: Event) {
  const input = event.target as HTMLInputElement
  const value = input.value

  if (value.length > 1) {
    // Handle paste
    const chars = value.split('').slice(0, 6)
    chars.forEach((c, i) => {
      if (i < 6) digits.value[i] = c
    })
    // Focus last input
    const nextInput = document.querySelector(`#otp-${Math.min(chars.length, 5)}`) as HTMLInputElement
    nextInput?.focus()
    return
  }

  digits.value[index] = value

  if (value && index < 5) {
    const nextInput = document.querySelector(`#otp-${index + 1}`) as HTMLInputElement
    nextInput?.focus()
  }

  // Auto-submit when all digits filled
  if (digits.value.every(d => d)) {
    handleVerify()
  }
}

function handleKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace' && !digits.value[index] && index > 0) {
    const prevInput = document.querySelector(`#otp-${index - 1}`) as HTMLInputElement
    prevInput?.focus()
  }
}

function handlePaste(event: ClipboardEvent) {
  event.preventDefault()
  const text = event.clipboardData?.getData('text') || ''
  const chars = text.replace(/\D/g, '').split('').slice(0, 6)
  chars.forEach((c, i) => {
    digits.value[i] = c
  })
  const lastIndex = Math.min(chars.length - 1, 5)
  const lastInput = document.querySelector(`#otp-${lastIndex}`) as HTMLInputElement
  lastInput?.focus()

  if (chars.length === 6) {
    setTimeout(handleVerify, 300)
  }
}

async function handleVerify() {
  errorMessage.value = ''
  const code = digits.value.join('')

  if (code.length !== 6) {
    errorMessage.value = 'Please enter the 6-digit code'
    return
  }

  try {
    const result = await verifyEmail(email.value, code)

    if (result.success) {
      verified.value = true
      toast.success('Email verified!', {
        description: 'Your account is now pending admin approval.',
      })

      setTimeout(() => {
        navigateTo(`/pending-approval?email=${encodeURIComponent(email.value)}`)
      }, 2500)
    }
  }
  catch (err: any) {
    errorMessage.value = err.message || 'Verification failed'
    // Shake the inputs
    const container = document.querySelector('.otp-inputs')
    container?.classList.add('shake')
    setTimeout(() => container?.classList.remove('shake'), 500)
  }
}

async function handleResend() {
  if (resendCooldown.value > 0) return

  try {
    const result = await resendCode(email.value)
    toast.success('Code resent!', {
      description: 'Check your email for the new code.',
    })

    if (result.verificationCode) {
      // Dev: auto-fill
      const chars = result.verificationCode.split('')
      chars.forEach((c: string, i: number) => {
        if (i < 6) digits.value[i] = c
      })
    }

    // Start cooldown
    resendCooldown.value = 60
    cooldownTimer = setInterval(() => {
      resendCooldown.value--
      if (resendCooldown.value <= 0 && cooldownTimer) {
        clearInterval(cooldownTimer)
      }
    }, 1000)
  }
  catch (err: any) {
    toast.error(err.message || 'Failed to resend code')
  }
}

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer)
})
</script>

<template>
  <div class="verify-page">
    <!-- Animated background -->
    <div class="animated-bg">
      <div class="gradient-orb orb-1" />
      <div class="gradient-orb orb-2" />
    </div>

    <div class="verify-container">
      <!-- Verified success -->
      <Transition name="scale" mode="out-in">
        <div v-if="verified" class="verified-card">
          <div class="success-animation">
            <div class="success-circle">
              <CheckCircle2 class="w-16 h-16 text-emerald-400" />
            </div>
            <div class="success-rings">
              <div class="ring ring-1" />
              <div class="ring ring-2" />
              <div class="ring ring-3" />
            </div>
          </div>
          <h2 class="verified-title">
            Email Verified! 🎉
          </h2>
          <p class="verified-text">
            Your email has been successfully verified.
          </p>
          <p class="verified-hint">
            Your account is now pending admin approval. You'll be notified once approved.
          </p>
          <div class="redirect-bar">
            <div class="redirect-progress" />
          </div>
          <p class="redirect-text">
            Redirecting...
          </p>
        </div>

        <!-- OTP Form -->
        <div v-else class="otp-card">
          <div class="otp-icon">
            <Mail class="w-8 h-8" />
          </div>
          <h2 class="otp-title">
            Verify Your Email
          </h2>
          <p class="otp-subtitle">
            We sent a 6-digit code to
          </p>
          <p class="otp-email">
            {{ email }}
          </p>

          <!-- Error -->
          <div v-if="errorMessage" class="error-banner">
            <Icon name="i-lucide-alert-circle" class="w-4 h-4 flex-shrink-0" />
            <span>{{ errorMessage }}</span>
          </div>

          <!-- OTP Inputs -->
          <div class="otp-inputs" @paste="handlePaste">
            <input
              v-for="(_, index) in digits"
              :id="`otp-${index}`"
              :key="index"
              v-model="digits[index]"
              type="text"
              inputmode="numeric"
              maxlength="1"
              class="otp-digit"
              :class="{ filled: digits[index], error: errorMessage }"
              :disabled="isLoading"
              @input="handleInput(index, $event)"
              @keydown="handleKeydown(index, $event)"
            >
          </div>

          <button
            class="verify-btn"
            :disabled="isLoading || digits.some(d => !d)"
            @click="handleVerify"
          >
            <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin" />
            <span>Verify Email</span>
            <ArrowRight v-if="!isLoading" class="w-4 h-4" />
          </button>

          <div class="resend-section">
            <p class="resend-text">
              Didn't receive the code?
            </p>
            <button
              class="resend-btn"
              :disabled="resendCooldown > 0"
              @click="handleResend"
            >
              <RotateCcw class="w-3.5 h-3.5" />
              <span v-if="resendCooldown > 0">Resend in {{ resendCooldown }}s</span>
              <span v-else>Resend Code</span>
            </button>
          </div>

          <NuxtLink to="/login" class="back-to-login">
            ← Back to Login
          </NuxtLink>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.verify-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: #0a0a0f;
  padding: 1rem;
}

.animated-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.35;
  animation: orbFloat 12s ease-in-out infinite;
}

.orb-1 {
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  top: -15%;
  left: -10%;
}

.orb-2 {
  width: 350px;
  height: 350px;
  background: linear-gradient(135deg, #10b981, #3b82f6);
  bottom: -15%;
  right: -10%;
  animation-delay: -6s;
}

@keyframes orbFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(30px, -20px) scale(1.05); }
}

.verify-container {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 460px;
}

/* OTP Card */
.otp-card {
  background: rgba(18, 18, 25, 0.95);
  border-radius: 24px;
  padding: 3rem 2.5rem;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(20px);
}

.otp-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.15));
  color: #667eea;
  margin-bottom: 1.25rem;
}

.otp-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 0.5rem;
}

.otp-subtitle {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
}

.otp-email {
  color: #667eea;
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
}

/* Error */
.error-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  font-size: 0.8rem;
  margin-bottom: 1rem;
}

/* OTP Inputs */
.otp-inputs {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.otp-inputs.shake {
  animation: shakeInputs 0.4s ease;
}

@keyframes shakeInputs {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-8px); }
  50% { transform: translateX(8px); }
  75% { transform: translateX(-4px); }
}

.otp-digit {
  width: 52px;
  height: 58px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 2px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 1.5rem;
  font-weight: 700;
  text-align: center;
  outline: none;
  transition: all 0.2s ease;
  caret-color: #667eea;
}

.otp-digit:focus {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.06);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
  transform: scale(1.05);
}

.otp-digit.filled {
  border-color: rgba(102, 126, 234, 0.3);
  background: rgba(102, 126, 234, 0.06);
}

.otp-digit.error {
  border-color: rgba(239, 68, 68, 0.5);
  background: rgba(239, 68, 68, 0.05);
}

/* Verify button */
.verify-btn {
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
}

.verify-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.35);
}

.verify-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Resend */
.resend-section {
  margin-top: 1.5rem;
}

.resend-text {
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
}

.resend-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #667eea;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.resend-btn:hover:not(:disabled) {
  background: rgba(102, 126, 234, 0.1);
  border-color: rgba(102, 126, 234, 0.3);
}

.resend-btn:disabled {
  color: rgba(255, 255, 255, 0.3);
  cursor: not-allowed;
}

.back-to-login {
  display: inline-block;
  margin-top: 1.25rem;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.8rem;
  text-decoration: none;
  transition: color 0.2s;
}

.back-to-login:hover {
  color: #fff;
}

/* Verified card */
.verified-card {
  background: rgba(18, 18, 25, 0.95);
  border-radius: 24px;
  padding: 3rem 2.5rem;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
}

.success-animation {
  position: relative;
  width: 100px;
  height: 100px;
  margin: 0 auto 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.success-circle {
  position: relative;
  z-index: 2;
  animation: successBounce 0.6s ease;
}

@keyframes successBounce {
  0% { transform: scale(0); }
  50% { transform: scale(1.3); }
  70% { transform: scale(0.9); }
  100% { transform: scale(1); }
}

.success-rings {
  position: absolute;
  inset: -20px;
}

.ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(16, 185, 129, 0.3);
  animation: ringExpand 1.5s ease-out infinite;
}

.ring-1 { animation-delay: 0s; }
.ring-2 { animation-delay: 0.3s; }
.ring-3 { animation-delay: 0.6s; }

@keyframes ringExpand {
  0% { transform: scale(0.5); opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
}

.verified-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 0.75rem;
}

.verified-text {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.verified-hint {
  color: rgba(255, 255, 255, 0.35);
  font-size: 0.8rem;
  margin-bottom: 1.5rem;
}

.redirect-bar {
  width: 100%;
  height: 4px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.redirect-progress {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #3b82f6);
  border-radius: 4px;
  animation: progressFill 2.5s ease-in-out forwards;
}

@keyframes progressFill {
  from { width: 0%; }
  to { width: 100%; }
}

.redirect-text {
  color: rgba(255, 255, 255, 0.35);
  font-size: 0.75rem;
}

/* Transitions */
.scale-enter-active,
.scale-leave-active {
  transition: all 0.4s ease;
}

.scale-enter-from {
  opacity: 0;
  transform: scale(0.9);
}

.scale-leave-to {
  opacity: 0;
  transform: scale(1.1);
}

/* Light mode */
:root:not(.dark) .verify-page {
  background: #f0f2f5;
}

:root:not(.dark) .otp-card,
:root:not(.dark) .verified-card {
  background: rgba(255, 255, 255, 0.97);
}

:root:not(.dark) .otp-title,
:root:not(.dark) .verified-title {
  color: #1a1a2e;
}

:root:not(.dark) .otp-digit {
  background: #f9fafb;
  border-color: #e5e7eb;
  color: #111827;
}

:root:not(.dark) .otp-digit:focus {
  border-color: #667eea;
  background: #fff;
}
</style>
