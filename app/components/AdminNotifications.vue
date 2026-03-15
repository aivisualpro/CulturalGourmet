<script setup lang="ts">
import { Bell, UserPlus, Check, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

const { isAdmin, fetchNotifications, token } = useAuth()

const showDropdown = ref(false)
const unreadCount = ref(0)
const notifications = ref<any[]>([])
const readIds = ref<Set<string>>(new Set())
const lastNotifiedCount = ref(0)

// Load read notification IDs from localStorage
function loadReadIds() {
  if (import.meta.client) {
    const saved = localStorage.getItem('cg_read_notifications')
    if (saved) {
      try { readIds.value = new Set(JSON.parse(saved)) } catch {}
    }
  }
}

function saveReadIds() {
  if (import.meta.client) {
    localStorage.setItem('cg_read_notifications', JSON.stringify([...readIds.value]))
  }
}

let pollInterval: ReturnType<typeof setInterval> | null = null

async function checkNotifications() {
  if (!isAdmin.value) return

  const result = await fetchNotifications()
  if (result && result.pendingUsers) {
    // Build notification items from pending users
    const items = result.pendingUsers.map((u: any) => ({
      id: u._id,
      type: 'registration',
      title: 'New registration',
      message: `${u.name} (${u.email}) wants to join`,
      avatar: u.avatar,
      name: u.name,
      time: u.createdAt,
      read: readIds.value.has(u._id),
    }))

    notifications.value = items
    unreadCount.value = items.filter((n: any) => !n.read).length

    // Desktop notification for truly new registrations
    if (result.totalPending > lastNotifiedCount.value && lastNotifiedCount.value > 0) {
      const diff = result.totalPending - lastNotifiedCount.value
      if (import.meta.client && 'Notification' in globalThis && Notification.permission === 'granted') {
        new Notification(`${diff} New Registration${diff > 1 ? 's' : ''}`, {
          body: `${diff} user${diff > 1 ? 's are' : ' is'} waiting for approval`,
          icon: '/logo.png',
          tag: 'registration-notification',
        })
      }
    }
    lastNotifiedCount.value = result.totalPending
  }
}

function markAllRead() {
  notifications.value.forEach(n => {
    readIds.value.add(n.id)
    n.read = true
  })
  unreadCount.value = 0
  saveReadIds()
}

function markAsRead(id: string) {
  readIds.value.add(id)
  const n = notifications.value.find(n => n.id === id)
  if (n) n.read = true
  unreadCount.value = notifications.value.filter(n => !n.read).length
  saveReadIds()
}

function toggleDropdown() {
  showDropdown.value = !showDropdown.value
}

function goToUsersManagement() {
  showDropdown.value = false
  navigateTo('/users-management')
}

function formatTimeAgo(dateStr: string) {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// Close dropdown when clicking outside
function onClickOutside(e: Event) {
  const target = e.target as HTMLElement
  if (!target.closest('.notification-wrapper')) {
    showDropdown.value = false
  }
}

onMounted(() => {
  if (isAdmin.value) {
    loadReadIds()

    if (import.meta.client && 'Notification' in globalThis && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    checkNotifications()
    pollInterval = setInterval(checkNotifications, 15000)
    document.addEventListener('click', onClickOutside)
  }
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
  document.removeEventListener('click', onClickOutside)
})
</script>

<template>
  <div v-if="isAdmin" class="notification-wrapper">
    <!-- Bell trigger -->
    <button class="notification-bell" @click.stop="toggleDropdown">
      <Bell class="w-5 h-5" />
      <Transition name="badge-anim">
        <span v-if="unreadCount > 0" class="bell-badge">
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
      </Transition>
    </button>

    <!-- Dropdown -->
    <Transition name="dropdown">
      <div v-if="showDropdown" class="notif-dropdown">
        <div class="dropdown-header">
          <h4>Notifications</h4>
          <button
            v-if="unreadCount > 0"
            class="mark-all-btn"
            @click="markAllRead"
          >
            <Check class="w-3.5 h-3.5" />
            Mark all read
          </button>
        </div>

        <div class="dropdown-body">
          <div v-if="notifications.length === 0" class="empty-notifs">
            <Bell class="w-6 h-6 text-muted-foreground/30" />
            <p>No notifications</p>
          </div>

          <div
            v-for="notif in notifications"
            :key="notif.id"
            class="notif-item"
            :class="{ unread: !notif.read }"
            @click="markAsRead(notif.id); goToUsersManagement()"
          >
            <div class="notif-dot" :class="{ active: !notif.read }" />
            <div class="notif-avatar">
              <img v-if="notif.avatar" :src="notif.avatar" :alt="notif.name">
              <span v-else>{{ getInitials(notif.name) }}</span>
            </div>
            <div class="notif-content">
              <p class="notif-message">
                <strong>{{ notif.name }}</strong> wants to join
              </p>
              <span class="notif-time">{{ formatTimeAgo(notif.time) }}</span>
            </div>
            <div class="notif-type-icon">
              <UserPlus class="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        <div class="dropdown-footer">
          <button class="view-all-btn" @click="goToUsersManagement">
            View all in Users Management →
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.notification-wrapper {
  position: relative;
}

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

.bell-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 100px;
  background: #ef4444;
  color: #fff;
  font-size: 0.6rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  border: 2px solid var(--color-background);
  animation: badgePop 0.3s ease;
}

@keyframes badgePop {
  0% { transform: scale(0); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

.badge-anim-enter-active,
.badge-anim-leave-active {
  transition: all 0.2s ease;
}
.badge-anim-enter-from,
.badge-anim-leave-to {
  transform: scale(0);
  opacity: 0;
}

/* Dropdown */
.notif-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 380px;
  max-height: 480px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.03);
  overflow: hidden;
  z-index: 50;
  display: flex;
  flex-direction: column;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
}

.dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border);
}

.dropdown-header h4 {
  font-size: 0.875rem;
  font-weight: 650;
  color: var(--color-foreground);
}

.mark-all-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-muted-foreground);
  font-size: 0.7rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.mark-all-btn:hover {
  background: var(--color-accent);
  color: var(--color-foreground);
}

/* Body */
.dropdown-body {
  flex: 1;
  overflow-y: auto;
  max-height: 340px;
}

.empty-notifs {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 3rem 1rem;
  color: var(--color-muted-foreground);
  font-size: 0.8rem;
}

/* Notification item */
.notif-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.15s;
  position: relative;
}

.notif-item:hover {
  background: var(--color-accent);
}

.notif-item.unread {
  background: rgba(59, 130, 246, 0.04);
}

.notif-item + .notif-item {
  border-top: 1px solid var(--color-border);
}

.notif-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: transparent;
}

.notif-dot.active {
  background: #3b82f6;
  box-shadow: 0 0 6px rgba(59, 130, 246, 0.4);
}

.notif-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--color-muted-foreground);
  flex-shrink: 0;
  overflow: hidden;
}

.notif-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.notif-content {
  flex: 1;
  min-width: 0;
}

.notif-message {
  font-size: 0.8rem;
  color: var(--color-foreground);
  line-height: 1.4;
}

.notif-message strong {
  font-weight: 600;
}

.notif-time {
  font-size: 0.65rem;
  color: var(--color-muted-foreground);
  margin-top: 2px;
  display: block;
}

.notif-type-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
  flex-shrink: 0;
}

/* Footer */
.dropdown-footer {
  border-top: 1px solid var(--color-border);
  padding: 10px 16px;
}

.view-all-btn {
  width: 100%;
  padding: 8px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: var(--color-primary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.view-all-btn:hover {
  background: var(--color-accent);
}
</style>
