<script setup lang="ts">
import { UserCheck, UserX, Loader2, Shield, Search, RefreshCw, MoreHorizontal, Trash2, ShieldCheck, ShieldOff, UserCog, RotateCcw } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

useHead({ title: 'Users Management — The Culture Gourmet' })

const { setHeader } = usePageHeader()
setHeader({ title: 'Users Management', icon: 'i-lucide-users-round', description: 'Manage registered users and approval requests' })

const { isAdmin, fetchPendingUsers, approveUser, updateUser, deleteUser, user: currentUser } = useAuth()

const activeTab = ref<'pending' | 'approved' | 'rejected' | 'all'>('pending')
const users = ref<any[]>([])
const isLoading = ref(false)
const searchQuery = ref('')

// Reject dialog
const showRejectDialog = ref(false)
const rejectUserId = ref('')
const rejectUserName = ref('')
const rejectReason = ref('')

// Delete confirmation dialog
const showDeleteDialog = ref(false)
const deleteTargetId = ref('')
const deleteTargetName = ref('')

// Role change confirmation
const showRoleDialog = ref(false)
const roleTargetId = ref('')
const roleTargetName = ref('')
const roleTargetNewRole = ref('')

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
    // Use the existing approve-user endpoint for pending, or update-user for approved users
    const isPending = users.value.find((u: any) => u._id === rejectUserId.value)?.approvalStatus === 'pending'
    if (isPending) {
      const result = await approveUser(rejectUserId.value, 'reject', rejectReason.value)
      toast.success('User rejected', { description: result.message })
    }
    else {
      const result = await updateUser(rejectUserId.value, 'reject', { reason: rejectReason.value })
      toast.success('Access revoked', { description: result?.message })
    }
    showRejectDialog.value = false
    await Promise.all([loadUsers(), loadStats()])
  }
  catch (err: any) {
    toast.error(err.message)
  }
}

// Re-approve (rejected → approved)
async function handleReapprove(userId: string) {
  try {
    const result = await updateUser(userId, 'reapprove')
    toast.success('User re-approved!', { description: result?.message })
    await Promise.all([loadUsers(), loadStats()])
  }
  catch (err: any) {
    toast.error(err.message)
  }
}

// Delete user
function openDeleteDialog(userId: string, name: string) {
  deleteTargetId.value = userId
  deleteTargetName.value = name
  showDeleteDialog.value = true
}

async function handleDelete() {
  try {
    const result = await deleteUser(deleteTargetId.value)
    toast.success('User deleted', { description: result?.message })
    showDeleteDialog.value = false
    await Promise.all([loadUsers(), loadStats()])
  }
  catch (err: any) {
    toast.error(err.message)
  }
}

// Change role
function openRoleDialog(userId: string, name: string, currentRole: string) {
  roleTargetId.value = userId
  roleTargetName.value = name
  roleTargetNewRole.value = currentRole === 'super_admin' ? 'user' : 'super_admin'
  showRoleDialog.value = true
}

async function handleRoleChange() {
  try {
    const result = await updateUser(roleTargetId.value, 'change_role', { role: roleTargetNewRole.value })
    toast.success('Role updated', { description: result?.message })
    showRoleDialog.value = false
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

// Check if user can be managed (not self, not super_admin)
function canManage(user: any): boolean {
  if (user.role === 'super_admin') return false
  if (user._id === currentUser.value?.id) return false
  return true
}

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
              v-for="u in filteredUsers"
              :key="u._id"
              class="border-b last:border-0 hover:bg-muted/30 transition-colors"
            >
              <!-- User -->
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-3">
                  <div class="size-9 rounded-lg bg-accent flex items-center justify-center text-xs font-bold text-muted-foreground overflow-hidden shrink-0">
                    <img v-if="u.avatar" :src="u.avatar" :alt="u.name" class="w-full h-full object-cover">
                    <span v-else>{{ getInitials(u.name) }}</span>
                  </div>
                  <div>
                    <p class="text-sm font-semibold">{{ u.name }}</p>
                    <p class="text-xs text-muted-foreground">{{ u.email }}</p>
                  </div>
                </div>
              </td>

              <!-- Provider -->
              <td class="px-5 py-3.5">
                <Badge variant="outline" class="text-[10px] uppercase font-semibold tracking-wider">
                  {{ u.provider || 'email' }}
                </Badge>
              </td>

              <!-- Email verified -->
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-1.5">
                  <Icon
                    :name="u.emailVerified ? 'i-lucide-check-circle-2' : 'i-lucide-x-circle'"
                    class="w-4 h-4"
                    :class="u.emailVerified ? 'text-emerald-500' : 'text-red-400'"
                  />
                  <span class="text-xs" :class="u.emailVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-400'">
                    {{ u.emailVerified ? 'Verified' : 'Unverified' }}
                  </span>
                </div>
              </td>

              <!-- Status -->
              <td class="px-5 py-3.5">
                <span
                  class="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize border"
                  :class="getStatusColor(u.approvalStatus)"
                >
                  {{ u.approvalStatus }}
                </span>
              </td>

              <!-- Registered -->
              <td class="px-5 py-3.5">
                <span class="text-xs text-muted-foreground">{{ formatDate(u.createdAt) }}</span>
              </td>

              <!-- Actions -->
              <td class="px-5 py-3.5 text-right">
                <!-- Pending: Approve / Reject buttons -->
                <div v-if="u.approvalStatus === 'pending'" class="flex items-center justify-end gap-2">
                  <button
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                    @click="handleApprove(u._id)"
                  >
                    <UserCheck class="w-3.5 h-3.5" />
                    Approve
                  </button>
                  <button
                    class="inline-flex items-center justify-center size-8 rounded-md bg-red-500/10 text-red-500 border border-red-500/15 hover:bg-red-500/20 transition-colors cursor-pointer"
                    @click="openRejectDialog(u._id, u.name)"
                  >
                    <UserX class="w-3.5 h-3.5" />
                  </button>
                </div>

                <!-- Super Admin badge (no actions) -->
                <div v-else-if="u.role === 'super_admin'" class="flex items-center justify-end gap-1.5">
                  <Shield class="w-3.5 h-3.5 text-primary" />
                  <span class="text-xs font-semibold text-primary">Super Admin</span>
                </div>

                <!-- Approved/Rejected users: Dropdown actions -->
                <div v-else-if="canManage(u)" class="flex items-center justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <button class="inline-flex items-center justify-center size-8 rounded-md hover:bg-accent transition-colors cursor-pointer">
                        <MoreHorizontal class="w-4 h-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" class="w-48">
                      <DropdownMenuLabel class="text-xs">
                        Manage User
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />

                      <!-- Role change -->
                      <DropdownMenuItem
                        class="text-xs gap-2 cursor-pointer"
                        @click="openRoleDialog(u._id, u.name, u.role)"
                      >
                        <ShieldCheck v-if="u.role === 'user'" class="w-3.5 h-3.5" />
                        <ShieldOff v-else class="w-3.5 h-3.5" />
                        {{ u.role === 'user' ? 'Make Admin' : 'Remove Admin' }}
                      </DropdownMenuItem>

                      <!-- Re-approve (if rejected) -->
                      <DropdownMenuItem
                        v-if="u.approvalStatus === 'rejected'"
                        class="text-xs gap-2 cursor-pointer"
                        @click="handleReapprove(u._id)"
                      >
                        <RotateCcw class="w-3.5 h-3.5" />
                        Re-approve
                      </DropdownMenuItem>

                      <!-- Revoke access (if approved) -->
                      <DropdownMenuItem
                        v-if="u.approvalStatus === 'approved'"
                        class="text-xs gap-2 text-amber-600 dark:text-amber-400 cursor-pointer"
                        @click="openRejectDialog(u._id, u.name)"
                      >
                        <UserX class="w-3.5 h-3.5" />
                        Revoke Access
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <!-- Delete -->
                      <DropdownMenuItem
                        class="text-xs gap-2 text-red-600 dark:text-red-400 cursor-pointer"
                        @click="openDeleteDialog(u._id, u.name)"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                        Delete Account
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <!-- Fallback (own account) -->
                <span v-else class="text-xs text-muted-foreground">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>

    <!-- Reject / Revoke dialog -->
    <Dialog v-model:open="showRejectDialog">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Revoke Access</DialogTitle>
          <DialogDescription>
            Revoke {{ rejectUserName }}'s access to the platform. They will be automatically logged out.
          </DialogDescription>
        </DialogHeader>
        <div class="py-4">
          <textarea
            v-model="rejectReason"
            placeholder="Reason for revoking access (optional)..."
            class="w-full p-3 text-sm rounded-lg bg-muted border border-border focus:border-primary focus:outline-none resize-none transition-colors"
            rows="3"
          />
        </div>
        <div class="flex justify-end gap-3">
          <Button variant="outline" @click="showRejectDialog = false">
            Cancel
          </Button>
          <Button variant="destructive" @click="handleReject">
            Revoke Access
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Delete confirmation dialog -->
    <Dialog v-model:open="showDeleteDialog">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Account</DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete {{ deleteTargetName }}'s account? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div class="flex justify-end gap-3 pt-4">
          <Button variant="outline" @click="showDeleteDialog = false">
            Cancel
          </Button>
          <Button variant="destructive" @click="handleDelete">
            <Trash2 class="w-3.5 h-3.5 mr-1.5" />
            Delete Permanently
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Role change confirmation dialog -->
    <Dialog v-model:open="showRoleDialog">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Change Role</DialogTitle>
          <DialogDescription>
            {{ roleTargetNewRole === 'super_admin'
              ? `Promote ${roleTargetName} to Super Admin? They will have full admin access.`
              : `Demote ${roleTargetName} from Super Admin to regular User?`
            }}
          </DialogDescription>
        </DialogHeader>
        <div class="flex justify-end gap-3 pt-4">
          <Button variant="outline" @click="showRoleDialog = false">
            Cancel
          </Button>
          <Button @click="handleRoleChange">
            <UserCog class="w-3.5 h-3.5 mr-1.5" />
            {{ roleTargetNewRole === 'super_admin' ? 'Promote to Admin' : 'Set as User' }}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
