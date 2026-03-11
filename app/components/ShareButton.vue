<script setup lang="ts">
import { Share2, X, Copy, Mail, MessageSquare, QrCode, Check, ExternalLink } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

const props = defineProps<{
  url: string
  title: string
  description?: string
  color?: string
}>()

const isOpen = ref(false)
const copied = ref(false)
const qrDataUrl = ref('')

const fullUrl = computed(() => {
  if (import.meta.client) {
    return new URL(props.url, window.location.origin).href
  }
  return props.url
})

// Generate QR code using a free API
watch(isOpen, async (open) => {
  if (open && !qrDataUrl.value) {
    qrDataUrl.value = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(fullUrl.value)}&bgcolor=ffffff&color=000000&margin=12&format=svg`
  }
})

function openShareDialog(e: Event) {
  e.preventDefault()
  e.stopPropagation()
  isOpen.value = true
}

async function handleNativeShare() {
  if (navigator.share) {
    try {
      await navigator.share({
        title: props.title,
        text: props.description || `Check out ${props.title} on The Culture Gourmet`,
        url: fullUrl.value,
      })
      isOpen.value = false
    }
    catch {
      // User cancelled
    }
  }
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(fullUrl.value)
    copied.value = true
    toast.success('Link copied!', { description: 'Share it anywhere!' })
    setTimeout(() => { copied.value = false }, 2000)
  }
  catch {
    // Fallback
    const input = document.createElement('input')
    input.value = fullUrl.value
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }
}

function shareViaEmail() {
  const subject = encodeURIComponent(props.title + ' — The Culture Gourmet')
  const body = encodeURIComponent(
    `${props.description || 'Check this out!'}\n\n${fullUrl.value}\n\nSent from The Culture Gourmet`,
  )
  window.open(`mailto:?subject=${subject}&body=${body}`, '_self')
}

function shareViaSMS() {
  const body = encodeURIComponent(`${props.title}: ${fullUrl.value}`)
  window.open(`sms:?body=${body}`, '_self')
}

function downloadQR() {
  const link = document.createElement('a')
  link.href = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(fullUrl.value)}&bgcolor=ffffff&color=000000&margin=20&format=png`
  link.download = `${props.title.replace(/\s+/g, '-').toLowerCase()}-qr.png`
  link.click()
  toast.success('QR code downloaded!')
}

const supportsNativeShare = computed(() => import.meta.client && 'share' in navigator)
</script>

<template>
  <div>
    <!-- Share trigger button -->
    <button
      class="share-trigger"
      :title="`Share ${title}`"
      @click="openShareDialog"
    >
      <Share2 class="w-4 h-4" />
    </button>

    <!-- Share dialog -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="isOpen" class="share-overlay" @click.self="isOpen = false">
          <div class="share-dialog" @click.stop>
            <!-- Header -->
            <div class="share-header">
              <div class="share-header-left">
                <div class="share-icon-wrap">
                  <Share2 class="w-5 h-5" />
                </div>
                <div>
                  <h3 class="share-title">Share Link</h3>
                  <p class="share-subtitle">{{ title }}</p>
                </div>
              </div>
              <button class="close-btn" @click="isOpen = false">
                <X class="w-4 h-4" />
              </button>
            </div>

            <!-- QR Code -->
            <div class="qr-section">
              <div class="qr-container">
                <img
                  v-if="qrDataUrl"
                  :src="qrDataUrl"
                  :alt="`QR code for ${title}`"
                  class="qr-image"
                >
                <div v-else class="qr-placeholder">
                  <QrCode class="w-8 h-8 text-muted-foreground/30" />
                </div>
              </div>
              <p class="qr-hint">Scan to open on any device</p>
              <button class="download-qr-btn" @click="downloadQR">
                <Icon name="i-lucide-download" class="w-3.5 h-3.5" />
                <span>Download QR</span>
              </button>
            </div>

            <!-- URL display -->
            <div class="url-section">
              <div class="url-display">
                <ExternalLink class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span class="url-text">{{ fullUrl }}</span>
              </div>
              <button class="copy-btn" :class="{ copied }" @click="copyLink">
                <Check v-if="copied" class="w-4 h-4" />
                <Copy v-else class="w-4 h-4" />
                <span>{{ copied ? 'Copied!' : 'Copy' }}</span>
              </button>
            </div>

            <!-- Share actions -->
            <div class="share-actions">
              <p class="actions-label">Share via</p>
              <div class="actions-grid">
                <!-- Native share (mobile & supported platforms) -->
                <button v-if="supportsNativeShare" class="share-action-btn native" @click="handleNativeShare">
                  <div class="action-icon native-bg">
                    <Share2 class="w-5 h-5" />
                  </div>
                  <span>Share</span>
                </button>

                <!-- Email -->
                <button class="share-action-btn" @click="shareViaEmail">
                  <div class="action-icon email-bg">
                    <Mail class="w-5 h-5" />
                  </div>
                  <span>Email</span>
                </button>

                <!-- SMS -->
                <button class="share-action-btn" @click="shareViaSMS">
                  <div class="action-icon sms-bg">
                    <MessageSquare class="w-5 h-5" />
                  </div>
                  <span>Message</span>
                </button>

                <!-- Copy link -->
                <button class="share-action-btn" @click="copyLink">
                  <div class="action-icon copy-bg">
                    <Copy class="w-5 h-5" />
                  </div>
                  <span>Copy Link</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* Trigger button */
.share-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  color: var(--color-muted-foreground);
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.share-trigger:hover {
  background: var(--color-accent);
  color: var(--color-foreground);
  border-color: var(--color-primary);
  transform: scale(1.08);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.1);
}

/* Overlay */
.share-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  padding: 1rem;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active .share-dialog,
.modal-leave-active .share-dialog {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
}
.modal-enter-from {
  opacity: 0;
}
.modal-enter-from .share-dialog {
  transform: scale(0.92);
  opacity: 0;
}
.modal-leave-to {
  opacity: 0;
}
.modal-leave-to .share-dialog {
  transform: scale(0.95);
  opacity: 0;
}

/* Dialog */
.share-dialog {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05);
  overflow: hidden;
}

/* Header */
.share-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid var(--color-border);
}

.share-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.share-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--color-primary);
  color: var(--color-primary-foreground);
}

.share-title {
  font-size: 0.95rem;
  font-weight: 650;
  color: var(--color-foreground);
}

.share-subtitle {
  font-size: 0.75rem;
  color: var(--color-muted-foreground);
  margin-top: 1px;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: var(--color-muted-foreground);
  cursor: pointer;
  transition: all 0.15s;
}

.close-btn:hover {
  background: var(--color-accent);
  color: var(--color-foreground);
}

/* QR Section */
.qr-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 20px 16px;
}

.qr-container {
  width: 180px;
  height: 180px;
  border-radius: 16px;
  background: #ffffff;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.qr-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.qr-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}

.qr-hint {
  font-size: 0.7rem;
  color: var(--color-muted-foreground);
  margin-top: 10px;
}

.download-qr-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 8px;
  padding: 5px 12px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-muted-foreground);
  font-size: 0.7rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.download-qr-btn:hover {
  background: var(--color-accent);
  color: var(--color-foreground);
}

/* URL Section */
.url-section {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px;
  margin-bottom: 16px;
}

.url-display {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--color-accent);
  border: 1px solid var(--color-border);
  overflow: hidden;
}

.url-text {
  font-size: 0.75rem;
  color: var(--color-muted-foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: ui-monospace, monospace;
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--color-primary);
  border: none;
  color: var(--color-primary-foreground);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.copy-btn:hover {
  opacity: 0.9;
  transform: scale(1.02);
}

.copy-btn.copied {
  background: #10b981;
}

/* Share actions */
.share-actions {
  padding: 16px 20px 20px;
  border-top: 1px solid var(--color-border);
}

.actions-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-muted-foreground);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.share-action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 4px;
  border-radius: 12px;
  background: transparent;
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--color-foreground);
}

.share-action-btn span {
  font-size: 0.65rem;
  font-weight: 500;
  color: var(--color-muted-foreground);
}

.share-action-btn:hover {
  background: var(--color-accent);
  border-color: var(--color-primary);
  transform: translateY(-1px);
}

.action-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  transition: transform 0.2s;
}

.share-action-btn:hover .action-icon {
  transform: scale(1.1);
}

.native-bg {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15));
  color: #6366f1;
}

.email-bg {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.sms-bg {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.copy-bg {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}
</style>
