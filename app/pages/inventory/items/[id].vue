<script setup lang="ts">
import { toast } from 'vue-sonner'
import { getUnitAbbr } from '~/constants/units'
import { HEADER_ACTIONS_ID } from '~/composables/usePageHeader'

const route = useRoute()
const itemId = route.params.id as string

const { setHeader } = usePageHeader()
setHeader({ title: 'Item Transactions', icon: 'i-lucide-package' })

// ─── State ──────────────────────────────────────────────────
const item = ref<any>(null)
const transactions = ref<any[]>([])
const stations = ref<string[]>([])
const loading = ref(true)
const activeStation = ref('all')

const _fetch = $fetch as typeof $fetch<any, any>

// ─── Fetch ──────────────────────────────────────────────────
async function fetchData() {
  loading.value = true
  try {
    const data = await _fetch(`/api/items/${itemId}/transactions`)
    item.value = data.item
    transactions.value = data.transactions
    stations.value = data.stations

    if (item.value) {
      setHeader({ title: item.value.item, icon: 'i-lucide-package' })
    }
  }
  catch { toast.error('Failed to load item data') }
  finally { loading.value = false }
}

onMounted(fetchData)

// ─── Station Tabs ───────────────────────────────────────────
const stationTabs = computed(() => {
  const tabs = [{ key: 'all', label: 'All Stations' }]
  stations.value.forEach(s => tabs.push({ key: s, label: s }))
  return tabs
})

// ─── Helpers ────────────────────────────────────────────────
function formatLocalDate(d: Date | string): string {
  const date = new Date(d)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Ledger Computation ─────────────────────────────────────
// Groups transactions by date, computes Opening → In → Out → Closing
// "In" = prep entries (qty produced), "Out" = consumption (future: usage)
// For now, all prep entries count as "In" (production)
const ledger = computed(() => {
  let txns = transactions.value

  // Filter by station
  if (activeStation.value !== 'all') {
    txns = txns.filter(t => t.station === activeStation.value)
  }

  // Group by date
  const dateMap: Record<string, { inQty: number, outQty: number, entries: any[] }> = {}
  txns.forEach(t => {
    const dateKey = formatLocalDate(t.date)
    if (!dateMap[dateKey]) dateMap[dateKey] = { inQty: 0, outQty: 0, entries: [] }
    const day = dateMap[dateKey]!
    day.inQty += (t.qty || 0)
    day.entries.push(t)
  })

  // Sort dates chronologically
  const sortedDates = Object.keys(dateMap).sort()

  // Build ledger rows with running balance
  let running = 0
  return sortedDates.map(date => {
    const day = dateMap[date]!
    const opening = running
    const inQty = day.inQty
    const outQty = day.outQty
    const closing = opening + inQty - outQty
    running = closing

    return {
      date,
      opening,
      inQty,
      outQty,
      closing,
      entries: day.entries,
    }
  })
})

// Reversed ledger (most recent first) for display
const ledgerReversed = computed(() => [...ledger.value].reverse())

// Summary stats
const totalIn = computed(() => ledger.value.reduce((s, r) => s + r.inQty, 0))
const totalOut = computed(() => ledger.value.reduce((s, r) => s + r.outQty, 0))
const currentBalance = computed(() => ledger.value.length > 0 ? ledger.value[ledger.value.length - 1]!.closing : 0)
const totalDays = computed(() => ledger.value.length)

// Station count for badges
const stationCounts = computed(() => {
  const counts: Record<string, number> = { all: transactions.value.length }
  transactions.value.forEach((t: any) => {
    counts[t.station] = (counts[t.station] || 0) + 1
  })
  return counts
})

// Expanded row tracking
const expandedDates = ref<Set<string>>(new Set())
function toggleExpand(date: string) {
  if (expandedDates.value.has(date)) expandedDates.value.delete(date)
  else expandedDates.value.add(date)
}

const unitLabel = computed(() => {
  if (!item.value?.unit) return ''
  return getUnitAbbr(item.value.unit)
})
</script>

<template>
  <Teleport :to="`#${HEADER_ACTIONS_ID}`">
    <div class="flex items-center gap-2">
      <Button variant="ghost" size="sm" class="h-8 text-xs" @click="navigateTo('/inventory/items')">
        <Icon name="i-lucide-arrow-left" class="mr-1 size-3.5" />Back to Items
      </Button>
      <Separator orientation="vertical" class="h-5" />
      <Button variant="ghost" size="sm" class="h-8 text-xs" @click="fetchData">
        <Icon name="i-lucide-rotate-ccw" class="mr-1 size-3.5" />Refresh
      </Button>
    </div>
  </Teleport>

  <div class="w-full flex flex-col gap-5">
    <!-- Loading -->
    <template v-if="loading">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Skeleton class="h-24 rounded-xl" />
        <Skeleton class="h-24 rounded-xl" />
        <Skeleton class="h-24 rounded-xl" />
        <Skeleton class="h-24 rounded-xl" />
      </div>
      <Skeleton class="h-10 w-full rounded-lg" />
      <Card class="p-6"><div class="space-y-4"><Skeleton class="h-10 w-full" /><Skeleton class="h-10 w-full" /><Skeleton class="h-10 w-full" /></div></Card>
    </template>

    <template v-else-if="item">
      <!-- ═══ Item Header Card ═══ -->
      <Card class="relative overflow-hidden">
        <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
        <CardContent class="p-5">
          <div class="flex flex-col sm:flex-row sm:items-center gap-4">
            <div class="flex items-center gap-4 flex-1 min-w-0">
              <div class="size-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon name="i-lucide-package" class="size-7 text-primary" />
              </div>
              <div class="min-w-0">
                <h2 class="text-xl font-bold tracking-tight truncate">{{ item.item }}</h2>
                <div class="flex items-center gap-3 mt-1 flex-wrap">
                  <span v-if="item.itemSKU" class="text-xs font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">{{ item.itemSKU }}</span>
                  <Badge v-if="item.category" variant="outline" class="text-[10px]">{{ item.category }}</Badge>
                  <Badge v-if="item.subCategory" variant="secondary" class="text-[10px]">{{ item.subCategory }}</Badge>
                  <span v-if="item.unit" class="text-xs text-muted-foreground flex items-center gap-1">
                    <Icon name="i-lucide-ruler" class="size-3" />
                    {{ getUnitAbbr(item.unit) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- ═══ Summary Stats ═══ -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <!-- Current Balance -->
        <Card class="relative overflow-hidden group hover:shadow-md transition-shadow">
          <div class="absolute top-0 left-0 right-0 h-0.5 bg-primary" />
          <CardContent class="p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Current Stock</span>
              <div class="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon name="i-lucide-warehouse" class="size-4 text-primary" />
              </div>
            </div>
            <p class="text-2xl font-bold tabular-nums text-primary">{{ currentBalance }}</p>
            <p v-if="unitLabel" class="text-[10px] text-muted-foreground mt-0.5">{{ unitLabel }}</p>
          </CardContent>
        </Card>

        <!-- Total In -->
        <Card class="relative overflow-hidden group hover:shadow-md transition-shadow">
          <div class="absolute top-0 left-0 right-0 h-0.5 bg-emerald-500" />
          <CardContent class="p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total In</span>
              <div class="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Icon name="i-lucide-arrow-down-to-line" class="size-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p class="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">+{{ totalIn }}</p>
            <p v-if="unitLabel" class="text-[10px] text-muted-foreground mt-0.5">{{ unitLabel }}</p>
          </CardContent>
        </Card>

        <!-- Total Out -->
        <Card class="relative overflow-hidden group hover:shadow-md transition-shadow">
          <div class="absolute top-0 left-0 right-0 h-0.5 bg-rose-500" />
          <CardContent class="p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Out</span>
              <div class="size-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                <Icon name="i-lucide-arrow-up-from-line" class="size-4 text-rose-600 dark:text-rose-400" />
              </div>
            </div>
            <p class="text-2xl font-bold tabular-nums text-rose-600 dark:text-rose-400">{{ totalOut > 0 ? `-${totalOut}` : '0' }}</p>
            <p v-if="unitLabel" class="text-[10px] text-muted-foreground mt-0.5">{{ unitLabel }}</p>
          </CardContent>
        </Card>

        <!-- Active Days -->
        <Card class="relative overflow-hidden group hover:shadow-md transition-shadow">
          <div class="absolute top-0 left-0 right-0 h-0.5 bg-amber-500" />
          <CardContent class="p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Active Days</span>
              <div class="size-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Icon name="i-lucide-calendar-days" class="size-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p class="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{{ totalDays }}</p>
            <p class="text-[10px] text-muted-foreground mt-0.5">{{ stations.length }} station{{ stations.length !== 1 ? 's' : '' }}</p>
          </CardContent>
        </Card>
      </div>

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

      <!-- ═══ Transaction Ledger ═══ -->
      <Card v-if="ledgerReversed.length > 0">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b bg-muted/30">
                <th class="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-8" />
                <th class="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[160px]">Date</th>
                <th v-if="activeStation === 'all'" class="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Station</th>
                <th class="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Opening</th>
                <th class="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <span class="inline-flex items-center gap-1">
                    <span class="size-1.5 rounded-full bg-emerald-500" />In
                  </span>
                </th>
                <th class="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <span class="inline-flex items-center gap-1">
                    <span class="size-1.5 rounded-full bg-rose-500" />Out
                  </span>
                </th>
                <th class="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[100px] bg-muted/50">Closing</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="row in ledgerReversed" :key="row.date">
                <tr
                  class="border-b border-border/40 hover:bg-muted/20 transition-colors cursor-pointer"
                  @click="toggleExpand(row.date)"
                >
                  <td class="px-4 py-3">
                    <Icon
                      :name="expandedDates.has(row.date) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                      class="size-3.5 text-muted-foreground transition-transform"
                    />
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                      <Icon name="i-lucide-calendar" class="size-3.5 text-muted-foreground shrink-0" />
                      <div>
                        <p class="font-medium text-sm">{{ formatShortDate(row.date) }}</p>
                        <p class="text-[10px] text-muted-foreground">{{ row.entries.length }} entr{{ row.entries.length !== 1 ? 'ies' : 'y' }}</p>
                      </div>
                    </div>
                  </td>
                  <td v-if="activeStation === 'all'" class="px-4 py-3">
                    <div class="flex flex-wrap gap-1">
                      <span
                        v-for="st in [...new Set(row.entries.map((e: any) => e.station))]"
                        :key="st"
                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-medium"
                      >
                        <Icon name="i-lucide-map-pin" class="size-2.5 text-primary" />
                        {{ st }}
                      </span>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-right tabular-nums font-medium text-muted-foreground">
                    {{ row.opening }}
                  </td>
                  <td class="px-4 py-3 text-right tabular-nums">
                    <span v-if="row.inQty > 0" class="font-semibold text-emerald-600 dark:text-emerald-400">+{{ row.inQty }}</span>
                    <span v-else class="text-muted-foreground/40">—</span>
                  </td>
                  <td class="px-4 py-3 text-right tabular-nums">
                    <span v-if="row.outQty > 0" class="font-semibold text-rose-600 dark:text-rose-400">-{{ row.outQty }}</span>
                    <span v-else class="text-muted-foreground/40">—</span>
                  </td>
                  <td class="px-4 py-3 text-right tabular-nums font-bold bg-muted/20">
                    <span :class="row.closing > 0 ? 'text-foreground' : row.closing < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'">
                      {{ row.closing }}
                    </span>
                  </td>
                </tr>
                <!-- Expanded detail rows -->
                <Transition
                  enter-active-class="transition-all duration-200 ease-out"
                  enter-from-class="opacity-0"
                  enter-to-class="opacity-100"
                  leave-active-class="transition-all duration-150 ease-in"
                  leave-from-class="opacity-100"
                  leave-to-class="opacity-0"
                >
                  <tr v-if="expandedDates.has(row.date)">
                    <td :colspan="activeStation === 'all' ? 7 : 6" class="p-0">
                      <div class="bg-muted/10 border-l-2 border-primary/30 mx-4 my-1 rounded-lg overflow-hidden">
                        <table class="w-full text-xs">
                          <thead>
                            <tr class="bg-muted/40">
                              <th class="text-left px-3 py-2 font-medium text-muted-foreground">Time</th>
                              <th class="text-left px-3 py-2 font-medium text-muted-foreground">Station</th>
                              <th class="text-left px-3 py-2 font-medium text-muted-foreground">Description</th>
                              <th class="text-right px-3 py-2 font-medium text-muted-foreground">Qty</th>
                              <th class="text-left px-3 py-2 font-medium text-muted-foreground">Unit</th>
                              <th class="text-center px-3 py-2 font-medium text-muted-foreground">Type</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr
                              v-for="entry in row.entries"
                              :key="entry._id"
                              class="border-t border-border/20 hover:bg-muted/20 transition-colors"
                            >
                              <td class="px-3 py-2 text-muted-foreground tabular-nums">
                                {{ new Date(entry.createdAt || entry.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }}
                              </td>
                              <td class="px-3 py-2">
                                <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/5 text-[10px] font-medium">
                                  <Icon name="i-lucide-map-pin" class="size-2.5 text-primary" />
                                  {{ entry.station }}
                                </span>
                              </td>
                              <td class="px-3 py-2 text-muted-foreground max-w-[200px] truncate">
                                {{ entry.description || '—' }}
                              </td>
                              <td class="px-3 py-2 text-right tabular-nums font-semibold">
                                <span class="text-emerald-600 dark:text-emerald-400">+{{ entry.qty || 0 }}</span>
                              </td>
                              <td class="px-3 py-2 text-muted-foreground">
                                {{ entry.unit ? getUnitAbbr(entry.unit) : '—' }}
                              </td>
                              <td class="px-3 py-2 text-center">
                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                  <Icon name="i-lucide-arrow-down-to-line" class="size-2.5" />
                                  Prep
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                </Transition>
              </template>
              <!-- Totals row -->
              <tr class="bg-muted/40 font-semibold border-t-2 border-border">
                <td class="px-4 py-3" />
                <td class="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Totals</td>
                <td v-if="activeStation === 'all'" class="px-4 py-3" />
                <td class="px-4 py-3 text-right tabular-nums text-muted-foreground">—</td>
                <td class="px-4 py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">+{{ totalIn }}</td>
                <td class="px-4 py-3 text-right tabular-nums text-rose-600 dark:text-rose-400">{{ totalOut > 0 ? `-${totalOut}` : '—' }}</td>
                <td class="px-4 py-3 text-right tabular-nums bg-muted/20">
                  <span class="text-lg" :class="currentBalance > 0 ? 'text-primary' : currentBalance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'">
                    {{ currentBalance }}
                  </span>
                  <span v-if="unitLabel" class="text-[10px] text-muted-foreground ml-1">{{ unitLabel }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <!-- Empty State -->
      <Card v-else class="p-12">
        <div class="flex flex-col items-center gap-4 text-center">
          <div class="size-16 rounded-2xl bg-muted/60 flex items-center justify-center">
            <Icon name="i-lucide-scroll-text" class="size-8 text-muted-foreground" />
          </div>
          <div>
            <h3 class="text-lg font-semibold">No transactions yet</h3>
            <p class="text-sm text-muted-foreground mt-1">
              {{ activeStation !== 'all' ? `No transactions found for "${activeStation}".` : 'This item has no prep entries recorded yet.' }}
            </p>
          </div>
          <div class="flex gap-2">
            <Button variant="outline" @click="navigateTo('/inventory/prep')">
              <Icon name="i-lucide-cooking-pot" class="mr-1.5 size-4" />Go to Prep
            </Button>
            <Button variant="outline" @click="activeStation = 'all'" v-if="activeStation !== 'all'">
              <Icon name="i-lucide-layers" class="mr-1.5 size-4" />Show All Stations
            </Button>
          </div>
        </div>
      </Card>
    </template>

    <!-- Item Not Found -->
    <template v-else-if="!loading">
      <Card class="p-12">
        <div class="flex flex-col items-center gap-4 text-center">
          <div class="size-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <Icon name="i-lucide-package-x" class="size-8 text-destructive" />
          </div>
          <div>
            <h3 class="text-lg font-semibold">Item not found</h3>
            <p class="text-sm text-muted-foreground mt-1">The item you're looking for doesn't exist or has been deleted.</p>
          </div>
          <Button @click="navigateTo('/inventory/items')">
            <Icon name="i-lucide-arrow-left" class="mr-1.5 size-4" />Back to Items
          </Button>
        </div>
      </Card>
    </template>
  </div>
</template>
