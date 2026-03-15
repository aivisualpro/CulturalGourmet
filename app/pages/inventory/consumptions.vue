<script setup lang="ts">
import { toast } from 'vue-sonner'
import { HEADER_ACTIONS_ID } from '~/composables/usePageHeader'

const { setHeader } = usePageHeader()
setHeader({ title: 'Consumptions', icon: 'i-lucide-flame' })

// ─── State ──────────────────────────────────────────────────
const store = useDataStore()
const activeTab = ref<'daily' | 'weekly'>('daily')
const categories = computed(() => store.categories.value)
const entries = ref<any[]>([])
const loading = ref(true)
const saving = ref(false)

// Daily entry state
const selectedDate = ref(formatLocalDate(new Date()))
const showEntryForm = ref(false)

const entryForm = ref({
  category: '',
  subCategory: '',
  amount: '',
  remarks: '',
})

// Weekly state
const weekOffset = ref(0)

// Edit state
const editingId = ref<string | null>(null)
const editForm = ref({
  category: '',
  subCategory: '',
  amount: '',
  remarks: '',
})

// Delete state
const showDeleteDialog = ref(false)
const deletingEntry = ref<any>(null)

// ─── Helpers ────────────────────────────────────────────────
function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
}

// Get Monday of the current week with offset
function getWeekMonday(offset: number = 0): Date {
  const now = new Date()
  const day = now.getDay()
  // day=0 is Sunday, so Monday diff = day===0 ? -6 : 1-day
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff + (offset * 7))
  return monday
}

function getWeekSunday(monday: Date): Date {
  const sun = new Date(monday)
  sun.setDate(sun.getDate() + 6)
  return sun
}

function getWeekDays(monday: Date): string[] {
  const days: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    days.push(formatLocalDate(d))
  }
  return days
}

const weekMonday = computed(() => getWeekMonday(weekOffset.value))
const weekSunday = computed(() => getWeekSunday(weekMonday.value))
const weekDays = computed(() => getWeekDays(weekMonday.value))

const weekLabel = computed(() => {
  const m = weekMonday.value
  const s = weekSunday.value
  const fmtOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${m.toLocaleDateString('en-US', fmtOpts)} – ${s.toLocaleDateString('en-US', fmtOpts)}, ${s.getFullYear()}`
})

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ─── Sub-categories reactive to selected category ───────────
const availableSubCategories = computed(() => {
  const cat = categories.value.find((c: any) => c.name === entryForm.value.category)
  return cat?.subCategories?.filter((s: any) => s.status === 'active') || []
})

const editAvailableSubCategories = computed(() => {
  const cat = categories.value.find((c: any) => c.name === editForm.value.category)
  return cat?.subCategories?.filter((s: any) => s.status === 'active') || []
})

// ─── Fetch entries (date-specific, stays local) ─────────────
const _fetch = $fetch as typeof $fetch<any, any>

async function fetchEntries() {
  loading.value = true
  try {
    if (activeTab.value === 'daily') {
      entries.value = await _fetch('/api/consumptions', { params: { date: selectedDate.value } })
    }
    else {
      entries.value = await _fetch('/api/consumptions', {
        params: {
          from: formatLocalDate(weekMonday.value),
          to: formatLocalDate(weekSunday.value),
        },
      })
    }
  }
  catch {
    toast.error('Failed to load entries')
  }
  finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchEntries()
})

watch([selectedDate, activeTab], () => fetchEntries())
watch(weekOffset, () => { if (activeTab.value === 'weekly') fetchEntries() })

// Reset sub-category when category changes
watch(() => entryForm.value.category, () => { entryForm.value.subCategory = '' })
watch(() => editForm.value.category, () => { editForm.value.subCategory = '' })

// ─── Daily totals ───────────────────────────────────────────
const dailyTotal = computed(() => entries.value.reduce((sum: number, e: any) => sum + (e.amount || 0), 0))
const dailyByCategory = computed(() => {
  const map: Record<string, number> = {}
  entries.value.forEach((e: any) => {
    map[e.category] = (map[e.category] || 0) + (e.amount || 0)
  })
  return Object.entries(map).sort((a, b) => b[1] - a[1])
})

// ─── Weekly pivot data ──────────────────────────────────────
const weeklyPivot = computed(() => {
  // Group by category → day → total
  const cats: Record<string, Record<string, number>> = {}
  entries.value.forEach((e: any) => {
    const eDate = new Date(e.date)
    const dateKey = formatLocalDate(eDate)
    if (!cats[e.category]) cats[e.category] = {}
    const catEntry = cats[e.category]!
    catEntry[dateKey] = (catEntry[dateKey] || 0) + (e.amount || 0)
  })
  return Object.entries(cats)
    .map(([cat, days]) => ({
      category: cat,
      days: weekDays.value.map(d => days[d] || 0),
      total: weekDays.value.reduce((s, d) => s + (days[d] || 0), 0),
    }))
    .sort((a, b) => b.total - a.total)
})

const weeklyDayTotals = computed(() =>
  weekDays.value.map((_, i) => weeklyPivot.value.reduce((s, row) => s + (row.days[i] ?? 0), 0)),
)

const weeklyGrandTotal = computed(() => weeklyDayTotals.value.reduce((s, v) => s + v, 0))

// Category color lookup
function getCatColor(catName: string): string {
  const cat = categories.value.find((c: any) => c.name === catName)
  return cat?.color || 'blue'
}

const colorMap: Record<string, { bg: string, text: string, border: string }> = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' },
  sky: { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-500/20' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-500/20' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500/20' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20' },
  pink: { bg: 'bg-pink-500/10', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-500/20' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/20' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-500/20' },
  teal: { bg: 'bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-500/20' },
}

const defaultCMap = { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20' }

function getCMap(cat: string) {
  return colorMap[getCatColor(cat)] ?? defaultCMap
}

// ─── CRUD ───────────────────────────────────────────────────
async function saveEntry() {
  if (!entryForm.value.category || !entryForm.value.subCategory) {
    toast.error('Please select category and sub-category')
    return
  }
  const amt = parseFloat(entryForm.value.amount)
  if (!amt || amt <= 0) {
    toast.error('Please enter a valid amount')
    return
  }
  saving.value = true
  try {
    await $fetch('/api/consumptions', {
      method: 'POST',
      body: {
        date: selectedDate.value,
        category: entryForm.value.category,
        subCategory: entryForm.value.subCategory,
        amount: amt,
        remarks: entryForm.value.remarks.trim(),
      },
    })
    toast.success('Entry recorded!')
    entryForm.value = { category: '', subCategory: '', amount: '', remarks: '' }
    showEntryForm.value = false
    await fetchEntries()
  }
  catch {
    toast.error('Failed to save entry')
  }
  finally {
    saving.value = false
  }
}

function startEdit(entry: any) {
  editingId.value = entry._id
  editForm.value = {
    category: entry.category,
    subCategory: entry.subCategory,
    amount: String(entry.amount),
    remarks: entry.remarks || '',
  }
}

function cancelEdit() {
  editingId.value = null
}

async function saveEdit(id: string) {
  const amt = parseFloat(editForm.value.amount)
  if (!amt || amt <= 0) {
    toast.error('Please enter a valid amount')
    return
  }
  saving.value = true
  try {
    await $fetch(`/api/consumptions/${id}`, {
      method: 'PUT',
      body: {
        category: editForm.value.category,
        subCategory: editForm.value.subCategory,
        amount: amt,
        remarks: editForm.value.remarks.trim(),
      },
    })
    toast.success('Entry updated')
    editingId.value = null
    await fetchEntries()
  }
  catch {
    toast.error('Failed to update entry')
  }
  finally {
    saving.value = false
  }
}

function confirmDelete(entry: any) {
  deletingEntry.value = entry
  showDeleteDialog.value = true
}

async function handleDelete() {
  if (!deletingEntry.value) return
  try {
    await $fetch(`/api/consumptions/${deletingEntry.value._id}`, { method: 'DELETE' })
    toast.success('Entry deleted')
    showDeleteDialog.value = false
    deletingEntry.value = null
    await fetchEntries()
  }
  catch {
    toast.error('Failed to delete entry')
  }
}

// ─── Date navigation ────────────────────────────────────────
function goDate(offset: number) {
  const d = new Date(selectedDate.value + 'T00:00:00')
  d.setDate(d.getDate() + offset)
  selectedDate.value = formatLocalDate(d)
}

function goToday() {
  selectedDate.value = formatLocalDate(new Date())
}

const isToday = computed(() => selectedDate.value === formatLocalDate(new Date()))
const isCurrentWeek = computed(() => weekOffset.value === 0)
</script>

<template>
  <!-- Header Actions (teleported) -->
  <Teleport :to="`#${HEADER_ACTIONS_ID}`">
    <div class="flex items-center gap-2">
      <!-- Add Entry button — always rendered, invisible on weekly to prevent layout shift -->
      <Button
        size="sm"
        class="h-8 text-xs"
        :class="activeTab !== 'daily' ? 'invisible' : ''"
        @click="showEntryForm = !showEntryForm"
      >
        <Icon :name="showEntryForm ? 'i-lucide-x' : 'i-lucide-plus'" class="mr-1 size-3.5" />
        {{ showEntryForm ? 'Close' : 'Add Entry' }}
      </Button>

      <!-- Daily: Date Navigation -->
      <template v-if="activeTab === 'daily'">
        <Separator orientation="vertical" class="h-5 hidden sm:block" />
        <div class="hidden sm:flex items-center gap-1.5">
          <Button variant="outline" size="icon" class="size-7 shrink-0" @click="goDate(-1)">
            <Icon name="i-lucide-chevron-left" class="size-3.5" />
          </Button>
          <div class="relative">
            <input
              v-model="selectedDate"
              type="date"
              class="absolute inset-0 opacity-0 cursor-pointer z-10 w-full"
            >
            <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 border border-border/50 cursor-pointer hover:bg-muted transition-colors">
              <Icon name="i-lucide-calendar" class="size-3.5 text-primary shrink-0" />
              <div>
                <p class="text-xs font-semibold leading-tight">{{ formatDisplayDate(selectedDate) }}</p>
                <p class="text-[9px] text-muted-foreground leading-tight">{{ selectedDate }}</p>
              </div>
            </div>
          </div>
          <Button variant="outline" size="icon" class="size-7 shrink-0" @click="goDate(1)">
            <Icon name="i-lucide-chevron-right" class="size-3.5" />
          </Button>
          <Button v-if="!isToday" variant="ghost" size="sm" class="h-7 text-xs px-2" @click="goToday">
            Today
          </Button>
        </div>
        <!-- Summary pills -->
        <Separator orientation="vertical" class="h-5 hidden lg:block" />
        <div class="hidden lg:flex items-center gap-2">
          <div class="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/5 border border-primary/10">
            <Icon name="i-lucide-receipt" class="size-3 text-primary" />
            <span class="text-[10px] text-muted-foreground">Entries:</span>
            <span class="text-xs font-bold tabular-nums text-foreground">{{ entries.length }}</span>
          </div>
          <div class="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/5 border border-emerald-500/10">
            <Icon name="i-lucide-dollar-sign" class="size-3 text-emerald-600 dark:text-emerald-400" />
            <span class="text-[10px] text-muted-foreground">Total:</span>
            <span class="text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{{ formatCurrency(dailyTotal) }}</span>
          </div>
        </div>
      </template>

      <!-- Weekly: Week Navigation -->
      <template v-if="activeTab === 'weekly'">
        <Separator orientation="vertical" class="h-5 hidden sm:block" />
        <div class="hidden sm:flex items-center gap-1.5">
          <Button variant="outline" size="icon" class="size-7 shrink-0" @click="weekOffset--">
            <Icon name="i-lucide-chevron-left" class="size-3.5" />
          </Button>
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 border border-border/50">
            <Icon name="i-lucide-calendar-range" class="size-3.5 text-primary shrink-0" />
            <div>
              <p class="text-xs font-semibold leading-tight">{{ weekLabel }}</p>
              <p class="text-[9px] text-muted-foreground leading-tight">Mon – Sun</p>
            </div>
          </div>
          <Button variant="outline" size="icon" class="size-7 shrink-0" @click="weekOffset++">
            <Icon name="i-lucide-chevron-right" class="size-3.5" />
          </Button>
          <Button v-if="!isCurrentWeek" variant="ghost" size="sm" class="h-7 text-xs px-2" @click="weekOffset = 0">
            This Week
          </Button>
        </div>
        <!-- Week total pill -->
        <Separator orientation="vertical" class="h-5 hidden lg:block" />
        <div class="hidden lg:flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/5 border border-emerald-500/10">
          <Icon name="i-lucide-dollar-sign" class="size-3 text-emerald-600 dark:text-emerald-400" />
          <span class="text-[10px] text-muted-foreground">Week Total:</span>
          <span class="text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{{ formatCurrency(weeklyGrandTotal) }}</span>
        </div>
      </template>

      <!-- Tab Switcher (always rightmost) -->
      <Separator orientation="vertical" class="h-5 hidden sm:block" />
      <div class="hidden sm:flex items-center rounded-lg bg-muted p-0.5 gap-0.5">
        <button
          class="px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-200"
          :class="activeTab === 'daily' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
          @click="activeTab = 'daily'"
        >
          <Icon name="i-lucide-calendar-days" class="mr-1 size-3.5 inline-block align-[-3px]" />
          Daily
        </button>
        <button
          class="px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-200"
          :class="activeTab === 'weekly' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
          @click="activeTab = 'weekly'"
        >
          <Icon name="i-lucide-table-2" class="mr-1 size-3.5 inline-block align-[-3px]" />
          Weekly
        </button>
      </div>
    </div>
  </Teleport>

  <div class="w-full flex flex-col gap-5">
    <!-- Mobile Tab Switcher -->
    <div class="sm:hidden flex items-center rounded-lg bg-muted p-0.5 gap-0.5">
      <button
        class="flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 text-center"
        :class="activeTab === 'daily' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
        @click="activeTab = 'daily'"
      >
        Daily Entry
      </button>
      <button
        class="flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 text-center"
        :class="activeTab === 'weekly' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
        @click="activeTab = 'weekly'"
      >
        Weekly Sheet
      </button>
    </div>

    <!-- Mobile date/week navigation -->
    <template v-if="activeTab === 'daily'">
      <div class="sm:hidden flex items-center justify-between gap-2">
        <div class="flex items-center gap-1.5">
          <Button variant="outline" size="icon" class="size-8 shrink-0" @click="goDate(-1)">
            <Icon name="i-lucide-chevron-left" class="size-4" />
          </Button>
          <div class="relative">
            <input v-model="selectedDate" type="date" class="absolute inset-0 opacity-0 cursor-pointer z-10 w-full">
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 border border-border/50 cursor-pointer">
              <Icon name="i-lucide-calendar" class="size-4 text-primary shrink-0" />
              <div>
                <p class="text-sm font-semibold leading-tight">{{ formatDisplayDate(selectedDate) }}</p>
                <p class="text-[10px] text-muted-foreground leading-tight">{{ selectedDate }}</p>
              </div>
            </div>
          </div>
          <Button variant="outline" size="icon" class="size-8 shrink-0" @click="goDate(1)">
            <Icon name="i-lucide-chevron-right" class="size-4" />
          </Button>
          <Button v-if="!isToday" variant="ghost" size="sm" class="h-7 text-xs px-2" @click="goToday">
            Today
          </Button>
        </div>
      </div>
    </template>
    <template v-if="activeTab === 'weekly'">
      <div class="sm:hidden flex items-center justify-between gap-2">
        <div class="flex items-center gap-1.5">
          <Button variant="outline" size="icon" class="size-8 shrink-0" @click="weekOffset--">
            <Icon name="i-lucide-chevron-left" class="size-4" />
          </Button>
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 border border-border/50">
            <Icon name="i-lucide-calendar-range" class="size-4 text-primary shrink-0" />
            <div>
              <p class="text-sm font-semibold leading-tight">{{ weekLabel }}</p>
              <p class="text-[10px] text-muted-foreground leading-tight">Mon – Sun</p>
            </div>
          </div>
          <Button variant="outline" size="icon" class="size-8 shrink-0" @click="weekOffset++">
            <Icon name="i-lucide-chevron-right" class="size-4" />
          </Button>
          <Button v-if="!isCurrentWeek" variant="ghost" size="sm" class="h-7 text-xs px-2" @click="weekOffset = 0">
            This Week
          </Button>
        </div>
      </div>
    </template>

    <!-- ═══════════════════ DAILY VIEW ═══════════════════ -->
    <template v-if="activeTab === 'daily'">
      <!-- Quick Entry Form -->
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 -translate-y-3 scale-[0.98]"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 -translate-y-2 scale-[0.98]"
      >
        <Card v-if="showEntryForm" class="border-primary/20 bg-primary/[0.02] overflow-hidden">
          <div class="h-1 bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />
          <CardContent class="p-4 sm:p-5">
            <form class="space-y-4" @submit.prevent="saveEntry">
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <!-- Category -->
                <div class="space-y-1.5">
                  <Label class="text-xs font-medium">Category <span class="text-destructive">*</span></Label>
                  <select
                    v-model="entryForm.category"
                    class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="" disabled>Select category</option>
                    <option v-for="cat in categories" :key="cat._id" :value="cat.name">{{ cat.name }}</option>
                  </select>
                </div>
                <!-- Sub-category -->
                <div class="space-y-1.5">
                  <Label class="text-xs font-medium">Sub-category <span class="text-destructive">*</span></Label>
                  <select
                    v-model="entryForm.subCategory"
                    :disabled="!entryForm.category"
                    class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="" disabled>{{ entryForm.category ? 'Select sub-category' : 'Choose category first' }}</option>
                    <option v-for="sub in availableSubCategories" :key="sub._id" :value="sub.name">{{ sub.name }}</option>
                  </select>
                </div>
                <!-- Amount -->
                <div class="space-y-1.5">
                  <Label class="text-xs font-medium">Amount ($) <span class="text-destructive">*</span></Label>
                  <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">$</span>
                    <Input
                      v-model="entryForm.amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      class="pl-7 tabular-nums"
                    />
                  </div>
                </div>
                <!-- Remarks -->
                <div class="space-y-1.5">
                  <Label class="text-xs font-medium">Remarks</Label>
                  <Input v-model="entryForm.remarks" placeholder="Optional notes..." />
                </div>
              </div>
              <div class="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" class="h-8" @click="showEntryForm = false">
                  Cancel
                </Button>
                <Button type="submit" size="sm" class="h-8" :disabled="saving">
                  <Icon v-if="saving" name="i-lucide-loader-2" class="mr-1 size-3.5 animate-spin" />
                  <Icon v-else name="i-lucide-check" class="mr-1 size-3.5" />
                  Record Entry
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </Transition>

      <!-- Category Breakdown (mini cards) -->
      <div v-if="dailyByCategory.length > 0" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <div
          v-for="[catName, catTotal] in dailyByCategory"
          :key="catName"
          class="flex items-center gap-2.5 rounded-xl p-3 border transition-colors"
          :class="[getCMap(catName).bg, getCMap(catName).border]"
        >
          <div class="flex-1 min-w-0">
            <p class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground truncate">{{ catName }}</p>
            <p class="text-sm font-bold tabular-nums" :class="getCMap(catName).text">{{ formatCurrency(catTotal) }}</p>
          </div>
        </div>
      </div>

      <!-- Mobile summary -->
      <div class="lg:hidden grid grid-cols-2 gap-2">
        <div class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
          <Icon name="i-lucide-receipt" class="size-3.5 text-primary" />
          <span class="text-xs text-muted-foreground">Entries:</span>
          <span class="text-sm font-bold tabular-nums">{{ entries.length }}</span>
        </div>
        <div class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
          <Icon name="i-lucide-dollar-sign" class="size-3.5 text-emerald-600 dark:text-emerald-400" />
          <span class="text-xs text-muted-foreground">Total:</span>
          <span class="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{{ formatCurrency(dailyTotal) }}</span>
        </div>
      </div>

      <!-- Entries Table -->
      <Card>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b bg-muted/30">
                <th class="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</th>
                <th class="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Sub-category</th>
                <th class="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                <th class="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Remarks</th>
                <th class="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">Actions</th>
              </tr>
            </thead>
            <tbody v-if="loading">
              <tr v-for="i in 4" :key="i">
                <td class="px-4 py-3" colspan="5">
                  <Skeleton class="h-5 w-full" />
                </td>
              </tr>
            </tbody>
            <tbody v-else-if="entries.length === 0">
              <tr>
                <td colspan="5" class="px-4 py-12 text-center">
                  <div class="flex flex-col items-center gap-2 text-muted-foreground">
                    <div class="rounded-full bg-muted p-3">
                      <Icon name="i-lucide-clipboard-list" class="size-6" />
                    </div>
                    <p class="font-medium">No entries for this day</p>
                    <p class="text-xs">Click "Add Entry" to record your first consumption</p>
                  </div>
                </td>
              </tr>
            </tbody>
            <tbody v-else>
              <template v-for="entry in entries" :key="entry._id">
                <!-- View row -->
                <tr v-if="editingId !== entry._id" class="border-b border-border/40 hover:bg-muted/20 transition-colors group">
                  <td class="px-4 py-2.5">
                    <Badge variant="outline" class="text-[10px] font-medium px-2 py-0.5" :class="[getCMap(entry.category).bg, getCMap(entry.category).text, getCMap(entry.category).border]">
                      {{ entry.category }}
                    </Badge>
                  </td>
                  <td class="px-4 py-2.5 text-sm">{{ entry.subCategory }}</td>
                  <td class="px-4 py-2.5 text-right font-semibold tabular-nums">{{ formatCurrency(entry.amount) }}</td>
                  <td class="px-4 py-2.5 text-xs text-muted-foreground hidden sm:table-cell max-w-[200px] truncate">{{ entry.remarks || '—' }}</td>
                  <td class="px-4 py-2.5 text-right">
                    <div class="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" class="size-7" @click="startEdit(entry)">
                        <Icon name="i-lucide-pencil" class="size-3" />
                      </Button>
                      <Button variant="ghost" size="icon" class="size-7 text-destructive hover:text-destructive" @click="confirmDelete(entry)">
                        <Icon name="i-lucide-trash-2" class="size-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
                <!-- Inline edit row -->
                <tr v-else class="border-b border-primary/20 bg-primary/[0.02]">
                  <td class="px-3 py-2">
                    <select
                      v-model="editForm.category"
                      class="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option v-for="cat in categories" :key="cat._id" :value="cat.name">{{ cat.name }}</option>
                    </select>
                  </td>
                  <td class="px-3 py-2">
                    <select
                      v-model="editForm.subCategory"
                      class="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option v-for="sub in editAvailableSubCategories" :key="sub._id" :value="sub.name">{{ sub.name }}</option>
                    </select>
                  </td>
                  <td class="px-3 py-2">
                    <Input v-model="editForm.amount" type="number" step="0.01" min="0" class="h-8 text-right text-xs tabular-nums" />
                  </td>
                  <td class="px-3 py-2 hidden sm:table-cell">
                    <Input v-model="editForm.remarks" class="h-8 text-xs" placeholder="Remarks..." />
                  </td>
                  <td class="px-3 py-2 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" class="size-7" @click="cancelEdit">
                        <Icon name="i-lucide-x" class="size-3" />
                      </Button>
                      <Button variant="default" size="icon" class="size-7" :disabled="saving" @click="saveEdit(entry._id)">
                        <Icon v-if="saving" name="i-lucide-loader-2" class="size-3 animate-spin" />
                        <Icon v-else name="i-lucide-check" class="size-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              </template>
              <!-- Totals row -->
              <tr class="bg-muted/40 font-semibold">
                <td class="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground" colspan="2">Total</td>
                <td class="px-4 py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{{ formatCurrency(dailyTotal) }}</td>
                <td class="hidden sm:table-cell" />
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </template>

    <!-- ═══════════════════ WEEKLY VIEW ═══════════════════ -->
    <template v-if="activeTab === 'weekly'">
      <!-- Weekly Pivot Table -->
      <Card>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b bg-muted/30">
                <th class="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[140px] sticky left-0 bg-muted/30 z-10">Category</th>
                <th
                  v-for="(day, i) in dayLabels"
                  :key="day"
                  class="text-center px-3 py-3 text-xs font-medium uppercase tracking-wider min-w-[90px]"
                  :class="[i === 5 || i === 6 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground']"
                >
                  <div>{{ day }}</div>
                  <div class="text-[10px] font-normal text-muted-foreground/70 mt-0.5">
                    {{ new Date(weekDays[i] + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}
                  </div>
                </th>
                <th class="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[100px] bg-muted/50">Total</th>
              </tr>
            </thead>
            <tbody v-if="loading">
              <tr v-for="i in 5" :key="i">
                <td class="px-4 py-3" :colspan="9">
                  <Skeleton class="h-5 w-full" />
                </td>
              </tr>
            </tbody>
            <tbody v-else-if="weeklyPivot.length === 0">
              <tr>
                <td colspan="9" class="px-4 py-12 text-center">
                  <div class="flex flex-col items-center gap-2 text-muted-foreground">
                    <div class="rounded-full bg-muted p-3">
                      <Icon name="i-lucide-table-2" class="size-6" />
                    </div>
                    <p class="font-medium">No data for this week</p>
                    <p class="text-xs">Switch to Daily Entry to start recording consumptions</p>
                  </div>
                </td>
              </tr>
            </tbody>
            <tbody v-else>
              <tr v-for="row in weeklyPivot" :key="row.category" class="border-b border-border/40 hover:bg-muted/20 transition-colors">
                <td class="px-4 py-2.5 sticky left-0 bg-background z-10">
                  <Badge variant="outline" class="text-[10px] font-medium px-2 py-0.5" :class="[getCMap(row.category).bg, getCMap(row.category).text, getCMap(row.category).border]">
                    {{ row.category }}
                  </Badge>
                </td>
                <td v-for="(val, i) in row.days" :key="i" class="text-center px-3 py-2.5 tabular-nums">
                  <span v-if="val" class="text-sm font-medium">{{ formatCurrency(val) }}</span>
                  <span v-else class="text-muted-foreground/30">—</span>
                </td>
                <td class="text-right px-4 py-2.5 font-semibold tabular-nums bg-muted/20" :class="getCMap(row.category).text">
                  {{ formatCurrency(row.total) }}
                </td>
              </tr>
              <!-- Day totals row -->
              <tr class="bg-muted/40 font-semibold border-t-2 border-border">
                <td class="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground sticky left-0 bg-muted/40 z-10">Daily Total</td>
                <td v-for="(dayTotal, i) in weeklyDayTotals" :key="i" class="text-center px-3 py-3 tabular-nums">
                  <span v-if="dayTotal" class="text-sm">{{ formatCurrency(dayTotal) }}</span>
                  <span v-else class="text-muted-foreground/30">—</span>
                </td>
                <td class="text-right px-4 py-3 tabular-nums text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                  {{ formatCurrency(weeklyGrandTotal) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <!-- Category share breakdown -->
      <div v-if="weeklyPivot.length > 0" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <Card
          v-for="row in weeklyPivot"
          :key="row.category"
          class="relative overflow-hidden transition-all duration-200 hover:shadow-md"
          :class="getCMap(row.category).border"
        >
          <div class="absolute top-0 left-0 right-0 h-0.5 opacity-80" :class="getCMap(row.category).bg?.replace('/10', '')" />
          <CardContent class="p-3">
            <p class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground truncate mb-1">{{ row.category }}</p>
            <p class="text-lg font-bold tabular-nums" :class="getCMap(row.category).text">{{ formatCurrency(row.total) }}</p>
            <p class="text-[10px] text-muted-foreground tabular-nums">
              {{ weeklyGrandTotal ? ((row.total / weeklyGrandTotal) * 100).toFixed(1) : '0' }}% of total
            </p>
          </CardContent>
        </Card>
      </div>
    </template>

    <!-- Delete Confirmation -->
    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Entry?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the <strong>{{ formatCurrency(deletingEntry?.amount || 0) }}</strong> entry
            for <strong>{{ deletingEntry?.category }} → {{ deletingEntry?.subCategory }}</strong>. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="handleDelete">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
