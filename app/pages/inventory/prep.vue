<script setup lang="ts">
import { toast } from 'vue-sonner'
import { getUnitAbbr } from '~/constants/units'
import { HEADER_ACTIONS_ID } from '~/composables/usePageHeader'

const { setHeader } = usePageHeader()
setHeader({ title: 'Prep', icon: 'i-lucide-cooking-pot' })

// ─── Global Data Store ──────────────────────────────────────
const { preps: prepEntries, locations: stations, prepList: prepItems, items: allItems, ready: storeReady, fetchPreps } = useDataStore()
const loading = computed(() => !storeReady.value)
const search = ref('')
const showDialog = ref(false)
const showDeleteDialog = ref(false)
const editingEntry = ref<any>(null)
const deletingEntry = ref<any>(null)
const saving = ref(false)

// Active station tab
const activeStation = ref('all')

// Date / view state
const activeTab = ref<'daily' | 'weekly'>('daily')
const selectedDate = ref(new Date().toISOString().slice(0, 10))
const weekOffset = ref(0)

const defaultForm = () => ({
  date: new Date().toISOString().slice(0, 10),
  station: '',
  item: '',
  description: '',
  qty: undefined as number | undefined,
  unit: '',
})

const formData = ref(defaultForm())

const _fetch = $fetch as typeof $fetch<any, any>

async function fetchPrepEntries() {
  await fetchPreps()
}

// ─── Date helpers ───────────────────────────────────────────
function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function getWeekMonday(offset = 0): Date {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff + offset * 7)
}

function getWeekSunday(monday: Date): Date {
  const sun = new Date(monday)
  sun.setDate(sun.getDate() + 6)
  return sun
}

function getWeekDays(monday: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return formatLocalDate(d)
  })
}

const weekMonday = computed(() => getWeekMonday(weekOffset.value))
const weekSunday = computed(() => getWeekSunday(weekMonday.value))
const weekDays = computed(() => getWeekDays(weekMonday.value))
const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const weekLabel = computed(() => {
  const fmtOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${weekMonday.value.toLocaleDateString('en-US', fmtOpts)} – ${weekSunday.value.toLocaleDateString('en-US', fmtOpts)}, ${weekSunday.value.getFullYear()}`
})

const isToday = computed(() => selectedDate.value === formatLocalDate(new Date()))
const isCurrentWeek = computed(() => weekOffset.value === 0)

function goDate(offset: number) {
  const d = new Date(selectedDate.value + 'T00:00:00')
  d.setDate(d.getDate() + offset)
  selectedDate.value = formatLocalDate(d)
}

function goToday() { selectedDate.value = formatLocalDate(new Date()) }

// ─── Station Tabs ───────────────────────────────────────────
const stationTabs = computed(() => {
  const tabs = [{ key: 'all', label: 'All Stations' }]
  stations.value.forEach((s: any) => {
    tabs.push({ key: s.name, label: s.name })
  })
  return tabs
})

// ─── Computed (filtered list) ──────────────────────────────
const filtered = computed(() => {
  let list = prepEntries.value

  // Filter by active date/week
  if (activeTab.value === 'daily') {
    list = list.filter((e: any) => {
      const d = e.date ? new Date(e.date).toISOString().slice(0, 10) : ''
      return d === selectedDate.value
    })
  } else {
    const from = formatLocalDate(weekMonday.value)
    const to = formatLocalDate(weekSunday.value)
    list = list.filter((e: any) => {
      const d = e.date ? new Date(e.date).toISOString().slice(0, 10) : ''
      return d >= from && d <= to
    })
  }

  // Filter by station tab
  if (activeStation.value !== 'all') {
    list = list.filter((e: any) => e.station === activeStation.value)
  }

  // Filter by search
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter((e: any) =>
      e.item?.toLowerCase().includes(q)
      || e.station?.toLowerCase().includes(q)
      || e.description?.toLowerCase().includes(q)
      || e.unit?.toLowerCase().includes(q),
    )
  }

  return list
})

// Count per station (for badge) — based on full entries for the day/week
const stationCounts = computed(() => {
  // Get date-filtered list first
  let base = prepEntries.value
  if (activeTab.value === 'daily') {
    base = base.filter((e: any) => {
      const d = e.date ? new Date(e.date).toISOString().slice(0, 10) : ''
      return d === selectedDate.value
    })
  } else {
    const from = formatLocalDate(weekMonday.value)
    const to = formatLocalDate(weekSunday.value)
    base = base.filter((e: any) => {
      const d = e.date ? new Date(e.date).toISOString().slice(0, 10) : ''
      return d >= from && d <= to
    })
  }
  const counts: Record<string, number> = { all: base.length }
  base.forEach((e: any) => {
    if (e.station) counts[e.station] = (counts[e.station] || 0) + 1
  })
  return counts
})

// Daily total cost
const dailyTotal = computed(() => filtered.value.reduce((s: number, e: any) => s + getPrepCost(e), 0))

// Weekly pivot
const weeklyPivot = computed(() => {
  const cats: Record<string, Record<string, number>> = {}
  filtered.value.forEach((e: any) => {
    const dKey = e.date ? new Date(e.date).toISOString().slice(0, 10) : ''
    const item = e.item || 'Unknown'
    if (!cats[item]) cats[item] = {}
    cats[item]![dKey] = (cats[item]![dKey] || 0) + getPrepCost(e)
  })
  return Object.entries(cats).map(([item, days]) => ({
    item,
    days: weekDays.value.map(d => days[d] || 0),
    total: weekDays.value.reduce((s, d) => s + (days[d] || 0), 0),
  })).sort((a, b) => b.total - a.total)
})

const weeklyDayTotals = computed(() =>
  weekDays.value.map((_, i) => weeklyPivot.value.reduce((s, r) => s + (r.days[i] ?? 0), 0)),
)
const weeklyGrandTotal = computed(() => weeklyDayTotals.value.reduce((s, v) => s + v, 0))

// ─── Searchable dropdown helpers ────────────────────────────
const stationOpen = ref(false)
const stationSearch = ref('')
const filteredStations = computed(() => {
  if (!stationSearch.value) return stations.value
  const q = stationSearch.value.toLowerCase()
  return stations.value.filter((s: any) => s.name?.toLowerCase().includes(q))
})

function selectStation(station: any) {
  formData.value.station = station.name
  stationOpen.value = false
  stationSearch.value = ''
}

const itemOpen = ref(false)
const itemSearch = ref('')
const filteredPrepItems = computed(() => {
  if (!itemSearch.value) return prepItems.value
  const q = itemSearch.value.toLowerCase()
  return prepItems.value.filter((p: any) => p.prepName?.toLowerCase().includes(q))
})

function selectItem(item: any) {
  formData.value.item = item.prepName
  itemOpen.value = false
  itemSearch.value = ''
}

// ─── Helpers ────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(val)
}

// Build a name → wac lookup map from the global items store
const itemWacMap = computed(() => {
  const map = new Map<string, number>()
  allItems.value.forEach((it: any) => {
    if (it.item) map.set(it.item.toLowerCase(), it.wac || 0)
  })
  return map
})

// Compute cost for a prep entry using its consumedItems
function getPrepCost(entry: any): number {
  if (!entry.consumedItems?.length) return 0
  return entry.consumedItems.reduce((sum: number, ci: any) => {
    const wac = itemWacMap.value.get(ci.itemName?.toLowerCase() || '') || 0
    return sum + (ci.quantity || 0) * wac
  }, 0)
}

// ─── CRUD ───────────────────────────────────────────────────
function openCreate() {
  editingEntry.value = null
  formData.value = defaultForm()
  showDialog.value = true
}

function openEdit(entry: any) {
  editingEntry.value = entry
  formData.value = {
    date: entry.date ? new Date(entry.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    station: entry.station || '',
    item: entry.item || '',
    description: entry.description || '',
    qty: entry.qty ?? undefined,
    unit: entry.unit || '',
  }
  showDialog.value = true
}

async function handleSave() {
  if (!formData.value.station) { toast.error('Station is required'); return }
  if (!formData.value.item) { toast.error('Item is required'); return }
  saving.value = true

  try {
    if (editingEntry.value) {
      await _fetch(`/api/preps/${editingEntry.value._id}`, { method: 'PUT', body: formData.value })
      toast.success('Prep entry updated')
    }
    else {
      await _fetch('/api/preps', { method: 'POST', body: formData.value })
      toast.success('Prep entry created')
    }
    showDialog.value = false
    await fetchPrepEntries()
  }
  catch { toast.error('Failed to save prep entry') }
  finally { saving.value = false }
}

function confirmDelete(entry: any) { deletingEntry.value = entry; showDeleteDialog.value = true }

async function handleDelete() {
  if (!deletingEntry.value) return
  try {
    await _fetch(`/api/preps/${deletingEntry.value._id}`, { method: 'DELETE' })
    toast.success('Prep entry deleted')
    showDeleteDialog.value = false
    deletingEntry.value = null
    await fetchPrepEntries()
  }
  catch { toast.error('Failed to delete prep entry') }
}

</script>

<template>
  <ClientOnly>
    <Teleport :to="`#${HEADER_ACTIONS_ID}`" defer>
    <div class="flex items-center gap-2">
      <!-- Search -->
      <div class="relative hidden sm:block">
        <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input v-model="search" placeholder="Search prep..." class="pl-8 h-8 w-48 lg:w-64 text-xs" />
      </div>
      <p class="text-xs text-muted-foreground tabular-nums whitespace-nowrap hidden md:block">
        {{ filtered.length }} record{{ filtered.length !== 1 ? 's' : '' }}
      </p>

      <!-- Daily: Date Navigation -->
      <template v-if="activeTab === 'daily'">
        <Separator orientation="vertical" class="h-5 hidden sm:block" />
        <div class="hidden sm:flex items-center gap-1.5">
          <Button variant="outline" size="icon" class="size-7 shrink-0" @click="goDate(-1)">
            <Icon name="i-lucide-chevron-left" class="size-3.5" />
          </Button>
          <div class="relative">
            <input ref="datePickerRef" v-model="selectedDate" type="date" class="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full">
            <div
              class="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 border border-border/50 cursor-pointer hover:bg-muted transition-colors"
              @click="($refs.datePickerRef as HTMLInputElement)?.showPicker?.()"
            >
              <Icon name="i-lucide-calendar" class="size-3.5 text-primary shrink-0" />
              <p class="text-xs font-semibold">{{ formatDisplayDate(selectedDate) }}</p>
            </div>
          </div>
          <Button variant="outline" size="icon" class="size-7 shrink-0" @click="goDate(1)">
            <Icon name="i-lucide-chevron-right" class="size-3.5" />
          </Button>
          <Button v-if="!isToday" variant="ghost" size="sm" class="h-7 text-xs px-2" @click="goToday">Today</Button>
        </div>
        <!-- Entry + Total pills -->
        <Separator orientation="vertical" class="h-5 hidden lg:block" />
        <div class="hidden lg:flex items-center gap-2">
          <div class="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/5 border border-primary/10">
            <Icon name="i-lucide-receipt" class="size-3 text-primary" />
            <span class="text-[10px] text-muted-foreground">Entries:</span>
            <span class="text-xs font-bold tabular-nums">{{ filtered.length }}</span>
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
          <Button v-if="!isCurrentWeek" variant="ghost" size="sm" class="h-7 text-xs px-2" @click="weekOffset = 0">This Week</Button>
        </div>
        <Separator orientation="vertical" class="h-5 hidden lg:block" />
        <div class="hidden lg:flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/5 border border-emerald-500/10">
          <Icon name="i-lucide-dollar-sign" class="size-3 text-emerald-600 dark:text-emerald-400" />
          <span class="text-[10px] text-muted-foreground">Week Total:</span>
          <span class="text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{{ formatCurrency(weeklyGrandTotal) }}</span>
        </div>
      </template>

      <!-- Tab Switcher -->
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

      <!-- Add Prep button -->
      <Button size="sm" class="h-8 text-xs" @click="openCreate">
        <Icon name="i-lucide-plus" class="mr-1 size-3.5" />Add Prep
      </Button>
    </div>
    </Teleport>
  </ClientOnly>

  <div class="w-full flex flex-col gap-5">
    <!-- Mobile: Search -->
    <div class="sm:hidden relative">
      <Icon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input v-model="search" placeholder="Search prep..." class="pl-9" />
    </div>

    <!-- Mobile: Tab Switcher -->
    <div class="sm:hidden flex items-center rounded-lg bg-muted p-0.5 gap-0.5">
      <button
        class="flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 text-center"
        :class="activeTab === 'daily' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
        @click="activeTab = 'daily'"
      >Daily</button>
      <button
        class="flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 text-center"
        :class="activeTab === 'weekly' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
        @click="activeTab = 'weekly'"
      >Weekly</button>
    </div>

    <!-- Mobile: Date nav -->
    <template v-if="activeTab === 'daily'">
      <div class="sm:hidden flex items-center gap-1.5">
        <Button variant="outline" size="icon" class="size-8" @click="goDate(-1)">
          <Icon name="i-lucide-chevron-left" class="size-4" />
        </Button>
        <div class="relative flex-1">
          <input v-model="selectedDate" type="date" class="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full">
          <div
            class="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/60 border border-border/50 cursor-pointer"
            @click="(($event.target as HTMLElement).previousElementSibling as HTMLInputElement)?.showPicker?.()"
          >
            <Icon name="i-lucide-calendar" class="size-4 text-primary shrink-0" />
            <p class="text-sm font-semibold">{{ formatDisplayDate(selectedDate) }}</p>
          </div>
        </div>
        <Button variant="outline" size="icon" class="size-8" @click="goDate(1)">
          <Icon name="i-lucide-chevron-right" class="size-4" />
        </Button>
        <Button v-if="!isToday" variant="ghost" size="sm" class="h-8 text-xs" @click="goToday">Today</Button>
      </div>
    </template>
    <template v-if="activeTab === 'weekly'">
      <div class="sm:hidden flex items-center gap-1.5">
        <Button variant="outline" size="icon" class="size-8" @click="weekOffset--">
          <Icon name="i-lucide-chevron-left" class="size-4" />
        </Button>
        <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/60 border border-border/50 flex-1">
          <Icon name="i-lucide-calendar-range" class="size-4 text-primary shrink-0" />
          <p class="text-sm font-semibold leading-tight">{{ weekLabel }}</p>
        </div>
        <Button variant="outline" size="icon" class="size-8" @click="weekOffset++">
          <Icon name="i-lucide-chevron-right" class="size-4" />
        </Button>
        <Button v-if="!isCurrentWeek" variant="ghost" size="sm" class="h-8 text-xs" @click="weekOffset = 0">This Week</Button>
      </div>
    </template>

    <!-- ═══ Station Tabs ═══ -->
    <div class="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
      <button
        v-for="tab in stationTabs"
        :key="tab.key"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 border shrink-0"
        :class="activeStation === tab.key
          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
          : 'bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground'"
        @click="activeStation = tab.key"
      >
        <Icon v-if="tab.key === 'all'" name="i-lucide-layers" class="size-3" />
        <Icon v-else name="i-lucide-map-pin" class="size-3" />
        {{ tab.label }}
        <span
          v-if="stationCounts[tab.key]"
          class="inline-flex items-center justify-center rounded-full px-1.5 min-w-[18px] h-4 text-[10px] font-bold tabular-nums"
          :class="activeStation === tab.key
            ? 'bg-primary-foreground/20 text-primary-foreground'
            : 'bg-muted-foreground/10 text-muted-foreground'"
        >
          {{ stationCounts[tab.key] }}
        </span>
      </button>
    </div>

    <!-- Loading -->
    <Card v-if="loading" class="p-6">
      <div class="space-y-4">
        <Skeleton class="h-10 w-full" />
        <Skeleton class="h-10 w-full" />
        <Skeleton class="h-10 w-full" />
        <Skeleton class="h-10 w-3/4" />
      </div>
    </Card>

    <!-- ═══ DAILY VIEW ═══ -->
    <template v-else-if="activeTab === 'daily'">
      <!-- Table -->
      <Card v-if="filtered.length > 0">
        <div class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="text-xs font-semibold w-[50px]">#</TableHead>
                <TableHead class="text-xs font-semibold">Station</TableHead>
                <TableHead class="text-xs font-semibold">Item</TableHead>
                <TableHead class="text-xs font-semibold hidden md:table-cell">Description</TableHead>
                <TableHead class="text-xs font-semibold text-right">Qty</TableHead>
                <TableHead class="text-xs font-semibold">Unit</TableHead>
                <TableHead class="text-xs font-semibold text-right">Cost</TableHead>
                <TableHead class="text-xs font-semibold text-right">Total</TableHead>
                <TableHead class="text-xs font-semibold text-right w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="(entry, idx) in filtered"
                :key="entry._id"
                class="group cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <TableCell class="text-xs text-muted-foreground tabular-nums">{{ idx + 1 }}</TableCell>
                <TableCell>
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-foreground">
                    <Icon name="i-lucide-map-pin" class="size-3 text-primary" />
                    {{ entry.station }}
                  </span>
                </TableCell>
                <TableCell class="font-medium">{{ entry.item }}</TableCell>
                <TableCell>
                  <span v-if="entry.description" class="text-sm max-w-[200px] truncate block hidden md:block">{{ entry.description }}</span>
                  <span v-else class="text-muted-foreground text-sm hidden md:block">—</span>
                </TableCell>
                <TableCell class="text-right tabular-nums">{{ entry.qty ?? '—' }}</TableCell>
                <TableCell>
                  <span v-if="entry.unit" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 border border-border/50 text-xs font-medium">
                    <Icon name="i-lucide-ruler" class="size-3 text-muted-foreground" />
                    {{ getUnitAbbr(entry.unit) }}
                  </span>
                  <span v-else class="text-muted-foreground text-sm">—</span>
                </TableCell>
                <TableCell class="text-right tabular-nums">
                  <span v-if="getPrepCost(entry) > 0" class="font-medium text-muted-foreground">{{ formatCurrency(getPrepCost(entry)) }}</span>
                  <span v-else class="text-muted-foreground/40 text-xs">—</span>
                </TableCell>
                <TableCell class="text-right tabular-nums">
                  <span v-if="getPrepCost(entry) > 0" class="font-semibold text-emerald-600 dark:text-emerald-400">{{ formatCurrency(getPrepCost(entry)) }}</span>
                  <span v-else class="text-muted-foreground/40 text-xs">—</span>
                </TableCell>
                <TableCell class="text-right">
                  <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" class="size-7" @click.stop="openEdit(entry)">
                      <Icon name="i-lucide-pencil" class="size-3" />
                    </Button>
                    <Button variant="ghost" size="icon" class="size-7 text-destructive hover:text-destructive" @click.stop="confirmDelete(entry)">
                      <Icon name="i-lucide-trash-2" class="size-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              <!-- Totals row -->
              <TableRow class="bg-muted/40 font-semibold">
                <TableCell class="text-xs uppercase tracking-wider text-muted-foreground" colspan="7">Total</TableCell>
                <TableCell class="text-right tabular-nums text-emerald-600 dark:text-emerald-400">{{ formatCurrency(dailyTotal) }}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Card>

      <!-- Empty State -->
      <Card v-else class="p-12">
        <div class="flex flex-col items-center gap-4 text-center">
          <div class="size-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Icon name="i-lucide-cooking-pot" class="size-8 text-primary" />
          </div>
          <div>
            <h3 class="text-lg font-semibold">No prep entries</h3>
            <p class="text-sm text-muted-foreground mt-1">
              {{ activeStation !== 'all' ? `No entries for "${activeStation}" on this day.` : 'No prep entries recorded for this day.' }}
            </p>
          </div>
          <Button @click="openCreate">
            <Icon name="i-lucide-plus" class="mr-1.5 size-4" />Add Prep
          </Button>
        </div>
      </Card>
    </template>

    <!-- ═══ WEEKLY VIEW ═══ -->
    <template v-else-if="activeTab === 'weekly'">
      <Card>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b bg-muted/30">
                <th class="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[140px] sticky left-0 bg-muted/30 z-10">Item</th>
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
            <tbody v-if="weeklyPivot.length === 0">
              <tr>
                <td :colspan="9" class="px-4 py-12 text-center">
                  <div class="flex flex-col items-center gap-2 text-muted-foreground">
                    <Icon name="i-lucide-table-2" class="size-8" />
                    <p class="font-medium">No data for this week</p>
                  </div>
                </td>
              </tr>
            </tbody>
            <tbody v-else>
              <tr v-for="row in weeklyPivot" :key="row.item" class="border-b border-border/40 hover:bg-muted/20 transition-colors">
                <td class="px-4 py-2.5 sticky left-0 bg-background z-10 font-medium">{{ row.item }}</td>
                <td v-for="(val, i) in row.days" :key="i" class="text-center px-3 py-2.5 tabular-nums">
                  <span v-if="val" class="text-sm font-medium">{{ formatCurrency(val) }}</span>
                  <span v-else class="text-muted-foreground/30">—</span>
                </td>
                <td class="text-right px-4 py-2.5 font-semibold tabular-nums text-emerald-600 dark:text-emerald-400 bg-muted/20">
                  {{ formatCurrency(row.total) }}
                </td>
              </tr>
              <!-- Day totals -->
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
    </template>

    <!-- ═══ Create/Edit Dialog ═══ -->
    <Dialog v-model:open="showDialog">
      <DialogContent class="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{{ editingEntry ? 'Edit' : 'New' }} Prep Entry</DialogTitle>
          <DialogDescription class="sr-only">{{ editingEntry ? 'Edit' : 'Create' }} a prep entry</DialogDescription>
        </DialogHeader>
        <form class="space-y-5" @submit.prevent="handleSave">
          <!-- Date -->
          <div class="space-y-2">
            <Label for="prepDate">Date <span class="text-destructive">*</span></Label>
            <Input id="prepDate" v-model="formData.date" type="date" />
          </div>

          <!-- Station dropdown -->
          <div class="space-y-2">
            <Label>Station <span class="text-destructive">*</span></Label>
            <Popover v-model:open="stationOpen">
              <PopoverTrigger as-child>
                <button
                  type="button"
                  class="inline-flex items-center justify-between rounded-md border border-input bg-background ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full gap-1 h-9 text-sm px-3"
                >
                  <span v-if="formData.station" class="truncate flex items-center gap-1.5">
                    <Icon name="i-lucide-map-pin" class="size-3.5 shrink-0 text-primary/60" />
                    <span class="font-medium">{{ formData.station }}</span>
                  </span>
                  <span v-else class="text-muted-foreground truncate">Select station...</span>
                  <Icon name="i-lucide-chevrons-up-down" class="size-3 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent class="w-[280px] p-0" align="start">
                <div class="flex items-center border-b px-3 py-2">
                  <Icon name="i-lucide-search" class="size-3.5 text-muted-foreground mr-2 shrink-0" />
                  <input v-model="stationSearch" class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder="Search stations...">
                </div>
                <div class="max-h-[220px] overflow-y-auto p-1">
                  <button
                    v-for="station in filteredStations"
                    :key="station._id"
                    type="button"
                    class="w-full flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent"
                    :class="formData.station === station.name ? 'bg-primary/5 text-primary font-medium' : ''"
                    @click="selectStation(station)"
                  >
                    <Icon
                      :name="formData.station === station.name ? 'i-lucide-check' : 'i-lucide-map-pin'"
                      class="size-3.5 shrink-0"
                      :class="formData.station === station.name ? 'text-primary' : 'text-muted-foreground'"
                    />
                    <p class="truncate">{{ station.name }}</p>
                  </button>
                  <div v-if="filteredStations.length === 0" class="text-center py-4 text-xs text-muted-foreground">
                    <Icon name="i-lucide-map-pin" class="size-5 mx-auto mb-1.5 opacity-50" />
                    <p>No stations found</p>
                  </div>
                </div>
                <div v-if="formData.station" class="border-t p-1">
                  <button
                    type="button"
                    class="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    @click="formData.station = ''; stationOpen = false"
                  >
                    <Icon name="i-lucide-x" class="size-3" /> Clear
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <!-- Item dropdown -->
          <div class="space-y-2">
            <Label>Item <span class="text-destructive">*</span></Label>
            <Popover v-model:open="itemOpen">
              <PopoverTrigger as-child>
                <button
                  type="button"
                  class="inline-flex items-center justify-between rounded-md border border-input bg-background ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full gap-1 h-9 text-sm px-3"
                >
                  <span v-if="formData.item" class="truncate flex items-center gap-1.5">
                    <Icon name="i-lucide-clipboard-list" class="size-3.5 shrink-0 text-primary/60" />
                    <span class="font-medium">{{ formData.item }}</span>
                  </span>
                  <span v-else class="text-muted-foreground truncate">Select item...</span>
                  <Icon name="i-lucide-chevrons-up-down" class="size-3 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent class="w-[280px] p-0" align="start">
                <div class="flex items-center border-b px-3 py-2">
                  <Icon name="i-lucide-search" class="size-3.5 text-muted-foreground mr-2 shrink-0" />
                  <input v-model="itemSearch" class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder="Search items...">
                </div>
                <div class="max-h-[220px] overflow-y-auto p-1">
                  <button
                    v-for="item in filteredPrepItems"
                    :key="item._id"
                    type="button"
                    class="w-full flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent"
                    :class="formData.item === item.prepName ? 'bg-primary/5 text-primary font-medium' : ''"
                    @click="selectItem(item)"
                  >
                    <Icon
                      :name="formData.item === item.prepName ? 'i-lucide-check' : 'i-lucide-clipboard-list'"
                      class="size-3.5 shrink-0"
                      :class="formData.item === item.prepName ? 'text-primary' : 'text-muted-foreground'"
                    />
                    <div class="flex-1 text-left">
                      <p class="truncate">{{ item.prepName }}</p>
                      <p v-if="item.recipe" class="text-[10px] text-muted-foreground">
                        <Icon name="i-lucide-chef-hat" class="size-2.5 inline-block align-[-2px] mr-0.5" />
                        {{ item.recipe }}
                      </p>
                    </div>
                  </button>
                  <div v-if="filteredPrepItems.length === 0" class="text-center py-4 text-xs text-muted-foreground">
                    <Icon name="i-lucide-clipboard-list" class="size-5 mx-auto mb-1.5 opacity-50" />
                    <p>No items found</p>
                  </div>
                </div>
                <div v-if="formData.item" class="border-t p-1">
                  <button
                    type="button"
                    class="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    @click="formData.item = ''; itemOpen = false"
                  >
                    <Icon name="i-lucide-x" class="size-3" /> Clear
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <!-- Description + Qty + Unit -->
          <div class="grid grid-cols-3 gap-4">
            <div class="space-y-2">
              <Label for="prepDescription">Description</Label>
              <Input id="prepDescription" v-model="formData.description" placeholder="e.g. Double batch" />
            </div>
            <div class="space-y-2">
              <Label for="prepQty">Qty</Label>
              <Input id="prepQty" v-model.number="formData.qty" type="number" step="any" min="0" placeholder="e.g. 10" />
            </div>
            <div class="space-y-2">
              <Label>Unit</Label>
              <UnitSelect v-model="formData.unit" placeholder="Select unit" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" @click="showDialog = false">Cancel</Button>
            <Button type="submit" :disabled="saving">
              <Icon v-if="saving" name="i-lucide-loader-2" class="mr-1 size-4 animate-spin" />
              {{ editingEntry ? 'Update' : 'Create' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- ═══ Delete Confirmation ═══ -->
    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Prep Entry?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete <strong>{{ deletingEntry?.item }}</strong> ({{ deletingEntry?.station }}). This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="handleDelete">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
