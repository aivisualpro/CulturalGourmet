<script setup lang="ts">
import { Bell, UserCheck, UserX, Clock, CheckCircle2, XCircle, Users, Loader2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

const { isAdmin, fetchNotifications, fetchPendingUsers, approveUser, token } = useAuth()

const showPanel = ref(false)
const pendingCount = ref(0)
const pendingUsers = ref<any[]>([])
const allUsers = ref<any[]>([])
const isLoadingUsers = ref(false)
const activeTab = ref<'pending' | 'approved' | 'rejected' | 'all'>('pending')
const showRejectDialog = ref(false)
const rejectUserId = ref('')
const rejectReason = ref('')
const lastNotifiedCount = ref(0)
const hasNewNotifications = ref(false)

// Poll for notifications
let pollInterval: ReturnType<typeof setInterval> | null = null

async function checkNotifications() {
  if (!isAdmin.value) return

  const result = await fetchNotifications()
  if (result) {
    const newCount = result.totalPending

    // Desktop notification for NEW registrations
    if (newCount > lastNotifiedCount.value && lastNotifiedCount.value > 0) {
      const diff = newCount - lastNotifiedCount.value
      hasNewNotifications.value = true

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`${diff} New Registration${diff > 1 ? 's' : ''}`, {
          body: `${diff} user${diff > 1 ? 's are' : ' is'} waiting for approval`,
          icon: '/the culture gourmet logo.png',
          tag: 'registration-notification',
        })
      }
    }

    pendingCount.value = newCount
    lastNotifiedCount.value = newCount
  }
}

async function loadUsers() {
  isLoadingUsers.value = true
  const result = await fetchPendingUsers(activeTab.value)
  if (result) {
    allUsers.value = result.users
  }
  isLoadingUsers.value = false
}

async function handleApprove(userId: string) {
  try {
    const result = await approveUser(userId, 'approve')
    toast.success('User approved!', { description: result.message })
    loadUsers()
    checkNotifications()
  }
  catch (err: any) {
    toast.error(err.message)
  }
}

function openRejectDialog(userId: string) {
  rejectUserId.value = userId
  rejectReason.value = ''
  showRejectDialog.value = true
}

async function handleReject() {
  try {
    const result = await approveUser(rejectUserId.value, 'reject', rejectReason.value)
    toast.success('User rejected', { description: result.message })
    showRejectDialog.value = false
    loadUsers()
    checkNotifications()
  }
  catch (err: any) {
    toast.error(err.message)
  }
}

function openPanel() {
  showPanel.value = true
  hasNewNotifications.value = false
  loadUsers()
}

// Request notification permission on mount
onMounted(() => {
  if (isAdmin.value) {
    // Request desktop notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    checkNotifications()
    pollInterval = setInterval(checkNotifications, 15000) // Check every 15 seconds
  }
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})

watch(activeTab, () => {
  loadUsers()
})

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}
</script>

<template>
  <div v-if="isAdmin">
    <!-- Notification Bell -->
    <button class="notification-bell" @click="openPanel">
      <Bell class="w-5 h-5" />
      <Transition name="badge">
        <span v-if="pendingCount > 0" class="badge" :class="{ pulse: hasNewNotifications }">
          {{ pendingCount > 99 ? '99+' : pendingCount }}
        </span>
      </Transition>
    </button>

    <!-- Slide-over Panel -->
    <Teleport to="body">
      <Transition name="overlay">
        <div v-if="showPanel" class="panel-overlay" @click.self="showPanel = false">
          <Transition name="slide">
            <div v-if="showPanel" class="admin-panel">
              <div class="panel-header">
                <div class="panel-title-row">
                  <Users class="w-5 h-5 text-primary" />
                  <h3>Registration Manager</h3>
                </div>
                <button class="close-btn" @click="showPanel = false">
                  <Icon name="i-lucide-x" class="w-5 h-5" />
                </button>
              </div>

              <!-- Tabs -->
              <div class="panel-tabs">
                <button
                  class="tab-btn"
                  :class="{ active: activeTab === 'pending' }"
                  @click="activeTab = 'pending'"
                >
                  <Clock class="w-3.5 h-3.5" />
                  Pending
                  <span v-if="pendingCount > 0" class="tab-count">{{ pendingCount }}</span>
                </button>
                <button
                  class="tab-btn"
                  :class="{ active: activeTab === 'approved' }"
                  @click="activeTab = 'approved'"
                >
                  <CheckCircle2 class="w-3.5 h-3.5" />
                  Approved
                </button>
                <button
                  class="tab-btn"
                  :class="{ active: activeTab === 'rejected' }"
                  @click="activeTab = 'rejected'"
                >
                  <XCircle class="w-3.5 h-3.5" />
                  Rejected
                </button>
              </div>

              <!-- Users list -->
              <div class="panel-content">
                <div v-if="isLoadingUsers" class="loading-state">
                  <Loader2 class="w-6 h-6 animate-spin text-primary" />
                  <span>Loading users...</span>
                </div>

                <div v-else-if="allUsers.length === 0" class="empty-state">
                  <div class="empty-icon">
                    <Users class="w-8 h-8" />
                  </div>
                  <p>No {{ activeTab }} users</p>
                </div>

                <div v-else class="users-list">
                  <div v-for="user in allUsers" :key="user._id" class="user-card">
                    <div class="user-avatar">
                      <img v-if="user.avatar" :src="user.avatar" :alt="user.name">
                      <span v-else>{{ getInitials(user.name) }}</span>
                    </div>
                    <div class="user-info">
                      <div class="user-name">
                        {{ user.name }}
                      </div>
                      <div class="user-email">
                        {{ user.email }}
                      </div>
                      <div class="user-meta">
                        <span class="meta-item">
                          <Icon name="i-lucide-calendar" class="w-3 h-3" />
                          {{ formatDate(user.createdAt) }}
                        </span>
                        <span class="meta-item">
                          <Icon :name="user.emailVerified ? 'i-lucide-mail-check' : 'i-lucide-mail-x'" class="w-3 h-3" />
                          {{ user.emailVerified ? 'Verified' : 'Not verified' }}
                        </span>
                        <span v-if="user.provider" class="provider-badge">
                          {{ user.provider }}
                        </span>
                      </div>
                    </div>

                    <!-- Actions for pending users -->
                    <div v-if="activeTab === 'pending'" class="user-actions">
                      <button class="approve-btn" @click="handleApprove(user._id)">
                        <UserCheck class="w-4 h-4" />
                        Approve
                      </button>
                      <button class="reject-btn" @click="openRejectDialog(user._id)">
                        <UserX class="w-4 h-4" />
                      </button>
                    </div>

                    <!-- Status badges for other tabs -->
                    <div v-else class="user-status">
                      <span
                        class="status-badge"
                        :class="{
                          'badge-approved': user.approvalStatus === 'approved',
                          'badge-rejected': user.approvalStatus === 'rejected',
                        }"
                      >
                        {{ user.approvalStatus }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>

      <!-- Reject dialog -->
      <Transition name="modal">
        <div v-if="showRejectDialog" class="modal-overlay" @click.self="showRejectDialog = false">
          <div class="reject-modal">
            <h3>Reject Registration</h3>
            <p>Provide a reason for rejection (optional):</p>
            <textarea
              v-model="rejectReason"
              placeholder="Reason for rejection..."
              class="reject-textarea"
              rows="3"
            />
            <div class="modal-actions">
              <button class="cancel-btn" @click="showRejectDialog = false">
                Cancel
              </button>
              <button class="confirm-reject-btn" @click="handleReject">
                Reject User
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* Notification Bell */
.notification-bell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: transparent;
  border: none;
  color: var(--color-muted-foreground);
  cursor: pointer;
  transition: all 0.2s;
}

.notification-bell:hover {
  background: var(--color-accent);
  color: var(--color-foreground);
}

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 100px;
  background: #ef4444;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  border: 2px solid var(--color-background);
}

.badge.pulse {
  animation: badgePulse 1s ease infinite;
}

@keyframes badgePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.badge-enter-active,
.badge-leave-active {
  transition: all 0.2s ease;
}

.badge-enter-from,
.badge-leave-to {
  transform: scale(0);
  opacity: 0;
}

/* Panel overlay */
.panel-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.3s ease;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

/* Admin panel */
.admin-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 440px;
  max-width: 100%;
  height: 100%;
  background: var(--color-background);
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  box-shadow: -8px 0 30px rgba(0, 0, 0, 0.15);
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.panel-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.panel-title-row h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-foreground);
}

.close-btn {
  padding: 6px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: var(--color-muted-foreground);
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--color-accent);
}

/* Tabs */
.panel-tabs {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: var(--color-muted-foreground);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: var(--color-accent);
}

.tab-btn.active {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
}

.tab-count {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 100px;
  background: #ef4444;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Content */
.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 3rem 1rem;
  color: var(--color-muted-foreground);
  font-size: 0.875rem;
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--color-accent);
}

/* User cards */
.users-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  background: var(--color-card);
  transition: all 0.2s;
}

.user-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-muted-foreground);
  flex-shrink: 0;
  overflow: hidden;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-foreground);
}

.user-email {
  font-size: 0.75rem;
  color: var(--color-muted-foreground);
  margin-top: 1px;
}

.user-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  color: var(--color-muted-foreground);
}

.provider-badge {
  padding: 1px 8px;
  border-radius: 6px;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  background: var(--color-accent);
  color: var(--color-muted-foreground);
}

/* User actions */
.user-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.approve-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  color: #10b981;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.approve-btn:hover {
  background: rgba(16, 185, 129, 0.2);
}

.reject-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.15);
  color: #ef4444;
  cursor: pointer;
  transition: all 0.2s;
}

.reject-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

/* Status badges */
.status-badge {
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: capitalize;
}

.badge-approved {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.badge-rejected {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  padding: 1rem;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.reject-modal {
  background: var(--color-background);
  border-radius: 16px;
  padding: 1.5rem;
  max-width: 400px;
  width: 100%;
  border: 1px solid var(--color-border);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.reject-modal h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-foreground);
  margin-bottom: 0.5rem;
}

.reject-modal p {
  font-size: 0.85rem;
  color: var(--color-muted-foreground);
  margin-bottom: 1rem;
}

.reject-textarea {
  width: 100%;
  padding: 10px;
  border-radius: 10px;
  background: var(--color-accent);
  border: 1px solid var(--color-border);
  color: var(--color-foreground);
  font-size: 0.85rem;
  resize: vertical;
  outline: none;
  margin-bottom: 1rem;
}

.reject-textarea:focus {
  border-color: var(--color-primary);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.cancel-btn {
  padding: 8px 16px;
  border-radius: 8px;
  background: var(--color-accent);
  border: 1px solid var(--color-border);
  color: var(--color-foreground);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background: var(--color-border);
}

.confirm-reject-btn {
  padding: 8px 16px;
  border-radius: 8px;
  background: #ef4444;
  border: none;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.confirm-reject-btn:hover {
  background: #dc2626;
}
</style>
