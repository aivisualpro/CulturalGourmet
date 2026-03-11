<script setup lang="ts">
import { UserCheck, UserX, Loader2, Shield, Search, RefreshCw } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

useHead({ title: 'Users Management — The Culture Gourmet' })

const { setHeader } = usePageHeader()
setHeader({ title: 'Users Management', icon: 'i-lucide-users-round', description: 'Manage registered users and approval requests' })

const { isAdmin, fetchPendingUsers, approveUser } = useAuth()

const activeTab = ref<'pending' | 'approved' | 'rejected' | 'all'>('pending')
const users = ref<any[]>([])
const isLoading = ref(false)
const searchQuery = ref('')
const showRejectDialog = ref(false)
const rejectUserId = ref('')
const rejectUserName = ref('')
const rejectReason = ref('')

// Stats for tab badges
const stats = ref({ pending: 0, approved: 0, rejected: 0, total: 0 })

async function loadUsers() {
  isLoading.value = true
  try {
    const result = await fetchPendingUsers(activeTab.value)
    users.value = result?.users || []
  }
  catch (e: any) {
    console.error('Failed to load users:', e)
    users.value = []
  }
  finally {
    isLoading.value = false
  }
}

async function loadStats() {
  try {
    const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
      fetchPendingUsers('pending'),
      fetchPendingUsers('approved'),
      fetchPendingUsers('rejected'),
    ])
    stats.value = {
      pending: pendingRes?.users?.length || 0,
      approved: approvedRes?.users?.length || 0,
      rejected: rejectedRes?.users?.length || 0,
      total: (pendingRes?.users?.length || 0) + (approvedRes?.users?.length || 0) + (rejectedRes?.users?.length || 0),
    }
  }
  catch (e) {
    console.error('Failed to load stats:', e)
  }
}

async function handleApprove(userId: string) {
  try {
    const result = await approveUser(userId, 'approve')
    toast.success('User approved!', { description: result.message })
    await Promise.all([loadUsers(), loadStats()])
  }
  catch (err: any) {
    toast.error(err.message)
  }
}

function openRejectDialog(userId: string, name: string) {
  rejectUserId.value = userId
  rejectUserName.value = name
  rejectReason.value = ''
  showRejectDialog.value = true
}

async function handleReject() {
  try {
    const result = await approveUser(rejectUserId.value, 'reject', rejectReason.value)
    toast.success('User rejected', { description: result.message })
    showRejectDialog.value = false
    await Promise.all([loadUsers(), loadStats()])
  }
  catch (err: any) {
    toast.error(err.message)
  }
}

const filteredUsers = computed(() => {
  if (!searchQuery.value.trim()) return users.value
  const q = searchQuery.value.toLowerCase()
  return users.value.filter((u: any) =>
    u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q),
  )
})

watch(activeTab, () => loadUsers())

onMounted(async () => {
  await Promise.all([loadUsers(), loadStats()])
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
  return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
}

function getStatusColor(status: string) {
  switch (status) {
    case 'approved': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    case 'rejected': return 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20'
    case 'pending': return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20'
    default: return 'text-muted-foreground bg-muted'
  }
}

function getTabCount(tab: string): number {
  switch (tab) {
    case 'pending': return stats.value.pending
    case 'approved': return stats.value.approved
    case 'rejected': return stats.value.rejected
    case 'all': return stats.value.total
    default: return 0
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Main content -->
    <Card>
      <!-- Toolbar -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 border-b">
        <!-- Tabs with counts -->
        <div class="flex gap-1 bg-muted p-1 rounded-lg">
          <button
            v-for="tab in (['pending', 'approved', 'rejected', 'all'] as const)"
            :key="tab"
            class="px-3.5 py-1.5 rounded-md text-xs font-medium transition-all capitalize flex items-center gap-1.5"
            :class="activeTab === tab
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'"
            @click="activeTab = tab"
          >
            {{ tab }}
            <span
              v-if="getTabCount(tab) > 0"
              class="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full"
              :class="[
                tab === 'pending' && activeTab !== tab ? 'text-white bg-red-500' : '',
                tab === 'pending' && activeTab === tab ? 'text-amber-700 dark:text-amber-300 bg-amber-500/15' : '',
                tab === 'approved' ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/15' : '',
                tab === 'rejected' ? 'text-red-700 dark:text-red-300 bg-red-500/15' : '',
                tab === 'all' ? 'text-foreground bg-muted-foreground/10' : '',
              ]"
            >
              {{ getTabCount(tab) }}
            </span>
          </button>
        </div>

        <div class="flex items-center gap-3 w-full sm:w-auto">
          <!-- Search -->
          <div class="relative flex-1 sm:w-64">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search users..."
              class="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-muted border border-border focus:border-primary focus:outline-none transition-colors"
            >
          </div>
          <button
            class="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border bg-background hover:bg-accent transition-colors"
            @click="loadUsers(); loadStats()"
          >
            <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoading }" />
            Refresh
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <div v-if="isLoading" class="flex items-center justify-center gap-3 py-16">
          <Loader2 class="w-5 h-5 animate-spin text-primary" />
          <span class="text-sm text-muted-foreground">Loading users...</span>
        </div>

        <div v-else-if="filteredUsers.length === 0" class="flex flex-col items-center justify-center gap-3 py-16">
          <div class="flex items-center justify-center size-14 rounded-2xl bg-muted">
            <Icon name="i-lucide-users" class="w-7 h-7 text-muted-foreground/40" />
          </div>
          <p class="text-sm text-muted-foreground">No {{ activeTab === 'all' ? '' : activeTab }} users found</p>
        </div>

        <table v-else class="w-full">
          <thead>
            <tr class="border-b bg-muted/40">
              <th class="text-left text-xs font-medium text-muted-foreground px-5 py-3">User</th>
              <th class="text-left text-xs font-medium text-muted-foreground px-5 py-3">Provider</th>
              <th class="text-left text-xs font-medium text-muted-foreground px-5 py-3">Email Verified</th>
              <th class="text-left text-xs font-medium text-muted-foreground px-5 py-3">Status</th>
              <th class="text-left text-xs font-medium text-muted-foreground px-5 py-3">Registered</th>
              <th class="text-right text-xs font-medium text-muted-foreground px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in filteredUsers"
              :key="user._id"
              class="border-b last:border-0 hover:bg-muted/30 transition-colors"
            >
              <!-- User -->
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-3">
                  <div class="size-9 rounded-lg bg-accent flex items-center justify-center text-xs font-bold text-muted-foreground overflow-hidden shrink-0">
                    <img v-if="user.avatar" :src="user.avatar" :alt="user.name" class="w-full h-full object-cover">
                    <span v-else>{{ getInitials(user.name) }}</span>
                  </div>
                  <div>
                    <p class="text-sm font-semibold">{{ user.name }}</p>
                    <p class="text-xs text-muted-foreground">{{ user.email }}</p>
                  </div>
                </div>
              </td>

              <!-- Provider -->
              <td class="px-5 py-3.5">
                <Badge variant="outline" class="text-[10px] uppercase font-semibold tracking-wider">
                  {{ user.provider || 'email' }}
                </Badge>
              </td>

              <!-- Email verified -->
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-1.5">
                  <Icon
                    :name="user.emailVerified ? 'i-lucide-check-circle-2' : 'i-lucide-x-circle'"
                    class="w-4 h-4"
                    :class="user.emailVerified ? 'text-emerald-500' : 'text-red-400'"
                  />
                  <span class="text-xs" :class="user.emailVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-400'">
                    {{ user.emailVerified ? 'Verified' : 'Unverified' }}
                  </span>
                </div>
              </td>

              <!-- Status -->
              <td class="px-5 py-3.5">
                <span
                  class="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize border"
                  :class="getStatusColor(user.approvalStatus)"
                >
                  {{ user.approvalStatus }}
                </span>
              </td>

              <!-- Registered -->
              <td class="px-5 py-3.5">
                <span class="text-xs text-muted-foreground">{{ formatDate(user.createdAt) }}</span>
              </td>

              <!-- Actions -->
              <td class="px-5 py-3.5 text-right">
                <div v-if="user.approvalStatus === 'pending'" class="flex items-center justify-end gap-2">
                  <button
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                    @click="handleApprove(user._id)"
                  >
                    <UserCheck class="w-3.5 h-3.5" />
                    Approve
                  </button>
                  <button
                    class="inline-flex items-center justify-center size-8 rounded-md bg-red-500/10 text-red-500 border border-red-500/15 hover:bg-red-500/20 transition-colors cursor-pointer"
                    @click="openRejectDialog(user._id, user.name)"
                  >
                    <UserX class="w-3.5 h-3.5" />
                  </button>
                </div>
                <div v-else-if="user.role === 'super_admin'" class="flex items-center justify-end gap-1.5">
                  <Shield class="w-3.5 h-3.5 text-primary" />
                  <span class="text-xs font-semibold text-primary">Super Admin</span>
                </div>
                <span v-else class="text-xs text-muted-foreground">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>

    <!-- Reject dialog -->
    <Dialog v-model:open="showRejectDialog">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Registration</DialogTitle>
          <DialogDescription>
            Decline {{ rejectUserName }}'s registration request. You can optionally provide a reason.
          </DialogDescription>
        </DialogHeader>
        <div class="py-4">
          <textarea
            v-model="rejectReason"
            placeholder="Reason for rejection (optional)..."
            class="w-full p-3 text-sm rounded-lg bg-muted border border-border focus:border-primary focus:outline-none resize-none transition-colors"
            rows="3"
          />
        </div>
        <div class="flex justify-end gap-3">
          <Button variant="outline" @click="showRejectDialog = false">
            Cancel
          </Button>
          <Button variant="destructive" @click="handleReject">
            Reject User
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
