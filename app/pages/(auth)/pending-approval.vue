<script setup lang="ts">
import { Clock, CheckCircle2, XCircle, Bell, ArrowRight, RefreshCw } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'blank',
})

useSeoMeta({
  title: 'Pending Approval — The Culture Gourmet',
  description: 'Your account is pending admin approval',
})

const route = useRoute()
const { checkStatus } = useAuth()

const email = computed(() => (route.query.email as string) || '')
const status = ref<'pending' | 'approved' | 'rejected'>('pending')
const userName = ref('')
const isChecking = ref(false)
const checkCount = ref(0)
const showNotificationCallout = ref(false)

// Auto-check status every 10 seconds
let statusInterval: ReturnType<typeof setInterval> | null = null

async function checkApprovalStatus() {
  if (!email.value) return
  isChecking.value = true
  checkCount.value++

  try {
    const result = await checkStatus(email.value)
    if (result) {
      status.value = result.approvalStatus
      userName.value = result.name || ''

      if (result.approvalStatus === 'approved') {
        // Show desktop notification if available
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Account Approved! 🎉', {
            body: 'Your Culture Gourmet account has been approved. You can now sign in!',
            icon: '/logo.png',
          })
        }
        toast.success('Your account has been approved!', {
          description: 'You can now sign in to your account.',
          duration: 5000,
        })
        // Stop polling
        if (statusInterval) clearInterval(statusInterval)
      }
    }
  }
  catch {
    // Silently ignore errors
  }
  finally {
    isChecking.value = false
  }
}

// Request notification permission
async function requestNotificationPermission() {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      toast.success('Notifications enabled!', {
        description: "We'll notify you when your account is approved.",
      })
    }
  }
}

onMounted(() => {
  checkApprovalStatus()
  statusInterval = setInterval(checkApprovalStatus, 10000)

  // Check notification support (client-side only)
  if (import.meta.client && 'Notification' in globalThis) {
    showNotificationCallout.value = Notification.permission !== 'granted'
    if (Notification.permission === 'default') {
      requestNotificationPermission()
    }
  }
})

onUnmounted(() => {
  if (statusInterval) clearInterval(statusInterval)
})
</script>

<template>
  <div class="pending-page">
    <!-- Animated background -->
    <div class="animated-bg">
      <div class="gradient-orb orb-1" />
      <div class="gradient-orb orb-2" />
    </div>

    <div class="pending-container">
      <!-- Approved state -->
      <Transition name="scale" mode="out-in">
        <div v-if="status === 'approved'" key="approved" class="status-card approved-card">
          <div class="status-icon-wrap approved-icon">
            <CheckCircle2 class="w-14 h-14" />
          </div>
          <h2 class="status-title">
            You're Approved! 🎉
          </h2>
          <p class="status-text">
            Congratulations{{ userName ? `, ${userName}` : '' }}! Your account has been approved by an administrator.
          </p>
          <NuxtLink to="/login" class="action-btn approved-btn">
            <span>Sign In Now</span>
            <ArrowRight class="w-4 h-4" />
          </NuxtLink>
        </div>

        <!-- Rejected state -->
        <div v-else-if="status === 'rejected'" key="rejected" class="status-card rejected-card">
          <div class="status-icon-wrap rejected-icon">
            <XCircle class="w-14 h-14" />
          </div>
          <h2 class="status-title">
            Registration Declined
          </h2>
          <p class="status-text">
            Unfortunately, your registration request was not approved. Please contact the administrator for more information.
          </p>
          <a href="mailto:admin@aivisualpro.com" class="action-btn rejected-btn">
            <span>Contact Admin</span>
            <ArrowRight class="w-4 h-4" />
          </a>
          <NuxtLink to="/login" class="back-link">
            ← Back to Login
          </NuxtLink>
        </div>

        <!-- Pending state -->
        <div v-else key="pending" class="status-card pending-card">
          <!-- Animated clock -->
          <div class="pending-animation">
            <div class="clock-wrap">
              <Clock class="w-12 h-12 clock-icon" />
            </div>
            <div class="pulse-rings">
              <div class="pulse pulse-1" />
              <div class="pulse pulse-2" />
            </div>
          </div>

          <h2 class="status-title">
            Awaiting Approval
          </h2>
          <p class="status-text">
            Your account has been created and your email is verified.
            An administrator will review your registration shortly.
          </p>

          <div class="email-badge">
            <span class="email-label">Registered as</span>
            <span class="email-value">{{ email }}</span>
          </div>

          <!-- Live status check -->
          <div class="live-check">
            <div class="check-dot" :class="{ checking: isChecking }" />
            <span>Checking status... ({{ checkCount }})</span>
          </div>

          <button class="refresh-btn" :disabled="isChecking" @click="checkApprovalStatus">
            <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isChecking }" />
            <span>Check Now</span>
          </button>

          <!-- Notification callout -->
          <div v-if="showNotificationCallout" class="notification-callout">
            <Bell class="w-4 h-4 text-amber-400" />
            <div>
              <p class="callout-title">
                Enable Notifications
              </p>
              <p class="callout-text">
                Get notified instantly when your account is approved.
              </p>
            </div>
            <button class="callout-btn" @click="requestNotificationPermission">
              Enable
            </button>
          </div>

          <div class="helpful-info">
            <p class="info-title">
              What happens next?
            </p>
            <div class="info-steps">
              <div class="info-step">
                <div class="step-dot done" />
                <span>Account created ✓</span>
              </div>
              <div class="info-step">
                <div class="step-dot done" />
                <span>Email verified ✓</span>
              </div>
              <div class="info-step">
                <div class="step-dot active" />
                <span>Admin approval (waiting...)</span>
              </div>
              <div class="info-step">
                <div class="step-dot" />
                <span>Access granted</span>
              </div>
            </div>
          </div>

          <NuxtLink to="/login" class="back-link">
            ← Back to Login
          </NuxtLink>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.pending-page {
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
  opacity: 0.3;
  animation: orbFloat 12s ease-in-out infinite;
}

.orb-1 {
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  top: -15%;
  left: -10%;
}

.orb-2 {
  width: 350px;
  height: 350px;
  background: linear-gradient(135deg, #8b5cf6, #3b82f6);
  bottom: -15%;
  right: -10%;
  animation-delay: -6s;
}

@keyframes orbFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(30px, -20px) scale(1.05); }
}

.pending-container {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 500px;
}

/* Status cards */
.status-card {
  background: rgba(18, 18, 25, 0.95);
  border-radius: 24px;
  padding: 2.5rem;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(20px);
}

.status-icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border-radius: 20px;
  margin-bottom: 1.5rem;
}

.approved-icon {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  animation: iconBounce 0.6s ease;
}

.rejected-icon {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}

@keyframes iconBounce {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.status-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 0.75rem;
}

.status-text {
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.875rem;
  line-height: 1.7;
  margin-bottom: 1.5rem;
  max-width: 380px;
  margin-left: auto;
  margin-right: auto;
}

/* Action buttons */
.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 28px;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  border: none;
  cursor: pointer;
  color: #fff;
}

.approved-btn {
  background: linear-gradient(135deg, #10b981, #059669);
}

.approved-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.35);
}

.rejected-btn {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}

.rejected-btn:hover {
  background: rgba(239, 68, 68, 0.25);
}

/* Pending animation */
.pending-animation {
  position: relative;
  width: 100px;
  height: 100px;
  margin: 0 auto 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clock-wrap {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 18px;
  background: rgba(251, 191, 36, 0.12);
  color: #fbbf24;
}

.clock-icon {
  animation: clockPulse 2s ease-in-out infinite;
}

@keyframes clockPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.pulse-rings {
  position: absolute;
  inset: -10px;
}

.pulse {
  position: absolute;
  inset: 0;
  border-radius: 22px;
  border: 2px solid rgba(251, 191, 36, 0.2);
  animation: pulseExpand 2s ease-out infinite;
}

.pulse-2 {
  animation-delay: 0.5s;
}

@keyframes pulseExpand {
  0% { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(1.4); opacity: 0; }
}

/* Email badge */
.email-badge {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 20px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 1.25rem;
}

.email-label {
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.35);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.email-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #667eea;
}

/* Live check */
.live-check {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.35);
  margin-bottom: 1rem;
}

.check-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(251, 191, 36, 0.5);
  transition: all 0.3s;
}

.check-dot.checking {
  background: #fbbf24;
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.5);
  animation: dotPulse 0.5s ease infinite;
}

@keyframes dotPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.5); }
}

.refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 1.5rem;
}

.refresh-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Notification callout */
.notification-callout {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(251, 191, 36, 0.06);
  border: 1px solid rgba(251, 191, 36, 0.12);
  text-align: left;
  margin-bottom: 1.5rem;
}

.callout-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #fbbf24;
}

.callout-text {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 1px;
}

.callout-btn {
  padding: 6px 14px;
  border-radius: 8px;
  background: rgba(251, 191, 36, 0.15);
  border: 1px solid rgba(251, 191, 36, 0.3);
  color: #fbbf24;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  margin-left: auto;
}

.callout-btn:hover {
  background: rgba(251, 191, 36, 0.25);
}

/* Info steps */
.helpful-info {
  padding: 1rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 1.5rem;
}

.info-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 0.75rem;
}

.info-steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-step {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.45);
}

.step-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.15);
  flex-shrink: 0;
}

.step-dot.done {
  background: #10b981;
  border-color: #10b981;
}

.step-dot.active {
  background: transparent;
  border-color: #fbbf24;
  animation: dotPulseActive 1.5s ease infinite;
}

@keyframes dotPulseActive {
  0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.3); }
  50% { box-shadow: 0 0 0 4px rgba(251, 191, 36, 0); }
}

.back-link {
  display: inline-block;
  margin-top: 1rem;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.8rem;
  text-decoration: none;
  transition: color 0.2s;
}

.back-link:hover {
  color: #fff;
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
:root:not(.dark) .pending-page {
  background: #f0f2f5;
}

:root:not(.dark) .status-card {
  background: rgba(255, 255, 255, 0.97);
}

:root:not(.dark) .status-title {
  color: #1a1a2e;
}

:root:not(.dark) .status-text {
  color: #6b7280;
}
</style>
