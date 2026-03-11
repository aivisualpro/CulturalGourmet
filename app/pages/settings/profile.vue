<script setup lang="ts">
import { Mail, Shield, Calendar, Clock, LogOut, Paintbrush, User, Globe, KeyRound } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

useHead({ title: 'My Profile — The Culture Gourmet' })

const { setHeader } = usePageHeader()
setHeader({ title: 'My Profile', icon: 'i-lucide-user-circle', description: 'Your account details' })

const { user, logout } = useAuth()

const showThemeDialog = ref(false)

function formatDate(dateStr?: string) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function getInitials(name?: string) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getRoleBadge(role?: string) {
  switch (role) {
    case 'super_admin': return { label: 'Super Admin', class: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20' }
    default: return { label: 'User', class: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' }
  }
}

function handleLogout() {
  logout()
  toast.success('Logged out successfully')
}
</script>

<template>
  <div class="flex flex-col gap-6 max-w-4xl">
    <!-- Profile Header Card -->
    <Card class="overflow-hidden">
      <!-- Cover gradient -->
      <div class="h-32 bg-gradient-to-br from-primary/20 via-violet-500/15 to-emerald-500/10 relative">
        <div class="absolute inset-0 opacity-[0.03]" style="background-image: radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0); background-size: 20px 20px;" />
      </div>

      <div class="px-6 pb-6 -mt-12 relative">
        <div class="flex flex-col sm:flex-row items-start sm:items-end gap-5">
          <!-- Avatar -->
          <div class="size-24 rounded-2xl border-4 border-background bg-accent shadow-lg flex items-center justify-center overflow-hidden">
            <img
              v-if="user?.avatar"
              :src="user.avatar"
              :alt="user?.name"
              class="w-full h-full object-cover"
            >
            <span v-else class="text-2xl font-bold text-muted-foreground">
              {{ getInitials(user?.name) }}
            </span>
          </div>

          <!-- Name & role -->
          <div class="flex-1 pb-1">
            <div class="flex items-center gap-3 flex-wrap">
              <h2 class="text-xl font-bold">{{ user?.name || 'Guest' }}</h2>
              <span
                class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border"
                :class="getRoleBadge(user?.role).class"
              >
                <Shield class="w-3 h-3" />
                {{ getRoleBadge(user?.role).label }}
              </span>
            </div>
            <p class="text-sm text-muted-foreground mt-0.5">{{ user?.email }}</p>
          </div>

          <!-- Quick actions -->
          <div class="flex gap-2 sm:pb-1">
            <button
              class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border bg-background hover:bg-accent transition-colors"
              @click="showThemeDialog = true"
            >
              <Paintbrush class="w-4 h-4" />
              Theme
            </button>
            <button
              class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
              @click="handleLogout"
            >
              <LogOut class="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </Card>

    <!-- Details grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Account Information -->
      <Card>
        <div class="p-6">
          <h3 class="text-sm font-semibold mb-5 flex items-center gap-2">
            <div class="flex items-center justify-center size-8 rounded-lg bg-primary/10">
              <User class="w-4 h-4 text-primary" />
            </div>
            Account Information
          </h3>
          <div class="space-y-4">
            <div class="flex items-start gap-3">
              <div class="flex items-center justify-center size-9 rounded-lg bg-muted shrink-0 mt-0.5">
                <User class="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p class="text-xs text-muted-foreground">Full Name</p>
                <p class="text-sm font-medium">{{ user?.name || '—' }}</p>
              </div>
            </div>
            <Separator />
            <div class="flex items-start gap-3">
              <div class="flex items-center justify-center size-9 rounded-lg bg-muted shrink-0 mt-0.5">
                <Mail class="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p class="text-xs text-muted-foreground">Email Address</p>
                <p class="text-sm font-medium">{{ user?.email || '—' }}</p>
              </div>
            </div>
            <Separator />
            <div class="flex items-start gap-3">
              <div class="flex items-center justify-center size-9 rounded-lg bg-muted shrink-0 mt-0.5">
                <Shield class="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p class="text-xs text-muted-foreground">Role</p>
                <p class="text-sm font-medium capitalize">{{ user?.role?.replace('_', ' ') || '—' }}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <!-- Login Details -->
      <Card>
        <div class="p-6">
          <h3 class="text-sm font-semibold mb-5 flex items-center gap-2">
            <div class="flex items-center justify-center size-8 rounded-lg bg-emerald-500/10">
              <KeyRound class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            Login Details
          </h3>
          <div class="space-y-4">
            <div class="flex items-start gap-3">
              <div class="flex items-center justify-center size-9 rounded-lg bg-muted shrink-0 mt-0.5">
                <Globe class="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p class="text-xs text-muted-foreground">Sign-in Provider</p>
                <div class="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" class="text-[10px] uppercase font-semibold tracking-wider">
                    {{ user?.provider || 'email' }}
                  </Badge>
                </div>
              </div>
            </div>
            <Separator />
            <div class="flex items-start gap-3">
              <div class="flex items-center justify-center size-9 rounded-lg bg-muted shrink-0 mt-0.5">
                <Icon name="i-lucide-fingerprint" class="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p class="text-xs text-muted-foreground">Account ID</p>
                <p class="text-xs font-mono text-muted-foreground mt-0.5">{{ user?.id || '—' }}</p>
              </div>
            </div>
            <Separator />
            <div class="flex items-start gap-3">
              <div class="flex items-center justify-center size-9 rounded-lg bg-muted shrink-0 mt-0.5">
                <Clock class="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p class="text-xs text-muted-foreground">Session Status</p>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <div class="w-2 h-2 rounded-full bg-emerald-500" />
                  <span class="text-sm font-medium text-emerald-600 dark:text-emerald-400">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>

    <!-- Theme Dialog -->
    <Dialog v-model:open="showThemeDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Customize</DialogTitle>
          <DialogDescription class="text-xs text-muted-foreground">
            Customize & Preview in Real Time
          </DialogDescription>
        </DialogHeader>
        <ThemeCustomize />
      </DialogContent>
    </Dialog>
  </div>
</template>
