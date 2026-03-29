<script setup lang="ts">
import { toast } from 'vue-sonner'
import { getUnitAbbr, convertUnit } from '~/constants/units'
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

// ─── PO Dialog State ─────────────────────────────────────────
const poDialogOpen = ref(false)
const poDialogLoading = ref(false)
const poData = ref<any>(null)
const highlightedItemId = ref<string | null>(null)

async function openPoDialog(t: any) {
  if (t.type !== 'po') return
  const poId = t._id.split('-')[0]
  poDialogOpen.value = true
  poDialogLoading.value = true
  highlightedItemId.value = itemId
  try {
    poData.value = await _fetch(`/api/purchase-orders/${poId}`)
    setTimeout(() => {
      const el = document.getElementById('po-dialog-row-' + itemId)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => { highlightedItemId.value = null }, 5000)
    }, 300)
  } catch {
    toast.error('Failed to load purchase order')
    poDialogOpen.value = false
  } finally {
    poDialogLoading.value = false
  }
}

function closePo() {
  poDialogOpen.value = false
  poData.value = null
  highlightedItemId.value = null
}

const poLineGroups = computed(() => {
  if (!poData.value?.lineItems) return []
  const groups: Record<string, any[]> = {}
  for (const li of poData.value.lineItems) {
    const cat = li.category || 'Other'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(li)
  }
  return Object.entries(groups).map(([category, items]) => ({ category, items }))
})

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

// ─── Location Tabs ──────────────────────────────────────────
const stationTabs = computed(() => {
  const tabs = [{ key: 'all', label: 'All Locations' }]
  stations.value.forEach(s => tabs.push({ key: s, label: s }))
  return tabs
})

// ─── Helpers ────────────────────────────────────────────────
function formatDateMDY(dateStr: string | Date): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const y = d.getFullYear()
  return `${m}/${day}/${y}`
}

function fmt(v: number | undefined) {
  if (v == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v)
}

// ─── Ledger Computation ─────────────────────────────────────
// Dual balance: locationBalance (per-station) + overallBalance (item-wide)
const ledger = computed(() => {
  const allTxns = [...transactions.value].sort((a, b) => {
    const da = new Date(a.date || a.createdAt).getTime()
    const db = new Date(b.date || b.createdAt).getTime()
    if (da !== db) return da - db
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  let overallRunning = 0
  const stationRunning: Record<string, number> = {}

  const allRows = allTxns.map(t => {
    let displayType = 'Consumed'
    if (t.type === 'po') displayType = 'Purchased'
    else if (t.type === 'transferred') displayType = 'Transferred'

    let inQty = 0
    let outQty = 0
    const rawQty = t.qty || 0
    if (displayType === 'Purchased') inQty = rawQty
    else if (displayType === 'Transferred') {
      if (rawQty > 0) inQty = rawQty
      else outQty = Math.abs(rawQty)
    } else outQty = Math.abs(rawQty)

    const txnUnit = t.unit?.toLowerCase() || ''
    const baseUnit = item.value?.unit?.toLowerCase() || ''

    let convertedInQty = inQty
    let convertedOutQty = outQty

    if (baseUnit && txnUnit && baseUnit !== txnUnit) {
      if (inQty > 0) {
        const cin = convertUnit(inQty, txnUnit, baseUnit)
        if (cin.success) convertedInQty = cin.value
      }
      if (outQty > 0) {
        const cout = convertUnit(outQty, txnUnit, baseUnit)
        if (cout.success) convertedOutQty = cout.value
      }
    }

    const station = t.station || '—'
    if (!stationRunning[station]) stationRunning[station] = 0
    
    // Maintain running balances using the converted item base unit, rounded cleanly
    stationRunning[station] = Math.round((stationRunning[station] + convertedInQty - convertedOutQty) * 10000) / 10000
    overallRunning = Math.round((overallRunning + convertedInQty - convertedOutQty) * 10000) / 10000

    let description = t.description || ''
    if (displayType === 'Transferred') description = t.sourceLocation || station

    return {
      _id: t._id,
      date: t.date || t.createdAt,
      type: t.type,
      displayType,
      description,
      location: station,
      inQty,
      outQty,
      unit: t.unit || item.value?.unit || '',
      locationBalance: stationRunning[station],
      overallBalance: overallRunning,
      original: t,
    }
  })

  return activeStation.value === 'all'
    ? allRows
    : allRows.filter(r => r.location === activeStation.value)
})

const ledgerReversed = computed(() => [...ledger.value].reverse())

const stationCounts = computed(() => {
  const counts: Record<string, number> = { all: transactions.value.length }
  transactions.value.forEach((t: any) => {
    counts[t.station] = (counts[t.station] || 0) + 1
  })
  return counts
})
</script>

<template>
  <ClientOnly>
    <Teleport :to="`#${HEADER_ACTIONS_ID}`" defer>
      <div class="flex items-center gap-2 flex-wrap">
        <!-- Theme-primary chips: SKU · Category · Sub-Category -->
        <div v-if="item" class="flex items-center gap-1.5 flex-wrap">
          <span v-if="item.itemSKU" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-primary text-primary-foreground">
            <Icon name="i-lucide-tag" class="size-2.5" />{{ item.itemSKU }}
          </span>
          <span v-if="item.category" class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary/20 text-primary">{{ item.category }}</span>
          <span v-if="item.subCategory" class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary/10 text-primary/80">{{ item.subCategory }}</span>
        </div>
        <Separator orientation="vertical" class="h-5" />
        <Button variant="ghost" size="sm" class="h-8 text-xs" @click="navigateTo('/inventory/items')">
          <Icon name="i-lucide-arrow-left" class="mr-1 size-3.5" />Back to Items
        </Button>
        <Separator orientation="vertical" class="h-5" />
        <Button variant="ghost" size="sm" class="h-8 text-xs" @click="fetchData">
          <Icon name="i-lucide-rotate-ccw" class="mr-1 size-3.5" />Refresh
        </Button>
      </div>
    </Teleport>
  </ClientOnly>

  <div class="w-full flex flex-col gap-5">
    <!-- Loading -->
    <template v-if="loading">
      <Skeleton class="h-10 w-full rounded-lg" />
      <Card class="p-6">
        <div class="space-y-4">
          <Skeleton class="h-10 w-full" />
          <Skeleton class="h-10 w-full" />
          <Skeleton class="h-10 w-full" />
        </div>
      </Card>
    </template>

    <template v-else-if="item">
      <!-- Location Tabs -->
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
            :class="activeStation === tab.key ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted-foreground/10 text-muted-foreground'"
          >{{ stationCounts[tab.key] }}</span>
        </button>
      </div>

      <!-- Transaction Ledger -->
      <Card v-if="ledgerReversed.length > 0">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b bg-muted/30">
                <th class="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">Date</th>
                <th class="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">Type</th>
                <th class="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
                <th class="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">Location</th>
                <th class="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">In</th>
                <th class="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Out</th>
                <th class="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">UOM</th>
                <th class="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap bg-violet-50/60 dark:bg-violet-950/20">
                  <span class="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400">
                    <Icon name="i-lucide-map-pin" class="size-3" />Location Balance
                  </span>
                </th>
                <th class="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/50 whitespace-nowrap">
                  <span class="inline-flex items-center gap-1">
                    <Icon name="i-lucide-package" class="size-3" />Balance
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in ledgerReversed"
                :key="row._id"
                class="border-b border-border/40 hover:bg-muted/20 transition-colors cursor-pointer group"
                @click="openPoDialog(row.original)"
              >
                <td class="px-4 py-3 tabular-nums font-medium text-muted-foreground whitespace-nowrap">{{ formatDateMDY(row.date) }}</td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <span
                    class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium"
                    :class="{
                      'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20': row.displayType === 'Purchased',
                      'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20': row.displayType === 'Consumed',
                      'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20': row.displayType === 'Transferred'
                    }"
                  >{{ row.displayType }}</span>
                </td>
                <td class="px-4 py-3 text-muted-foreground max-w-[260px]">
                  <p class="truncate group-hover:text-foreground transition-colors">{{ row.description || '—' }}</p>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <span class="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <Icon name="i-lucide-map-pin" class="size-3 text-primary/60 shrink-0" />{{ row.location }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right tabular-nums">
                  <span v-if="row.inQty > 0" class="font-semibold text-emerald-600 dark:text-emerald-400">+{{ row.inQty }}</span>
                  <span v-else class="text-muted-foreground/40">—</span>
                </td>
                <td class="px-4 py-3 text-right tabular-nums">
                  <span v-if="row.outQty > 0" class="font-semibold text-rose-600 dark:text-rose-400">-{{ row.outQty }}</span>
                  <span v-else class="text-muted-foreground/40">—</span>
                </td>
                <td class="px-4 py-3 text-center">
                  <span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{{ getUnitAbbr(row.unit) || row.unit || '—' }}</span>
                </td>
                <td class="px-4 py-3 text-right tabular-nums font-semibold bg-violet-50/40 dark:bg-violet-950/10">
                  <span :class="row.locationBalance > 0 ? 'text-violet-600 dark:text-violet-400' : row.locationBalance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'">
                    {{ row.locationBalance }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right tabular-nums font-bold bg-muted/20">
                  <span :class="row.overallBalance > 0 ? 'text-foreground' : row.overallBalance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'">
                    {{ row.overallBalance }}
                  </span>
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
              {{ activeStation !== 'all' ? `No transactions found for "${activeStation}".` : 'This item has no transactions recorded yet.' }}
            </p>
          </div>
          <div class="flex gap-2">
            <Button variant="outline" @click="navigateTo('/inventory/prep')">
              <Icon name="i-lucide-cooking-pot" class="mr-1.5 size-4" />Go to Prep
            </Button>
            <Button v-if="activeStation !== 'all'" variant="outline" @click="activeStation = 'all'">
              <Icon name="i-lucide-layers" class="mr-1.5 size-4" />Show All Locations
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

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- PURCHASE ORDER VIEW DIALOG — Read-only, matches Edit PO dialog exactly -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <Dialog v-model:open="poDialogOpen">
    <DialogContent class="max-w-[70vw] sm:max-w-[70vw] w-full max-h-[95vh] flex flex-col p-0 gap-0 [&>button:last-child]:hidden">

      <!-- Header Bar -->
      <div class="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
        <div class="flex items-center gap-3">
          <div class="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="i-lucide-file-pen-line" class="size-5 text-primary" />
          </div>
          <div>
            <p class="font-semibold text-sm">Purchase Order</p>
            <p class="text-xs text-muted-foreground">
              Editing Invoice #{{ poData?.invoiceNumber || '—' }}<span v-if="poData?.vendorName"> · {{ poData.vendorName }}</span>
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <NuxtLink
            :to="`/inventory/purchase-orders?openPoId=${poData?._id}`"
            class="inline-flex items-center gap-1.5 px-3 h-8 rounded-md border border-input bg-background text-xs font-medium hover:bg-accent transition-colors"
          >
            <Icon name="i-lucide-external-link" class="size-3.5" />
            Open &amp; Edit
          </NuxtLink>
          <Button variant="outline" size="sm" class="h-8 text-xs" @click="closePo">Cancel</Button>
        </div>
      </div>

      <!-- Scrollable Body -->
      <div class="flex-1 overflow-y-auto overflow-x-hidden" style="overflow: auto; clip-path: none;">
        <div class="p-6 space-y-6">

          <!-- Highlight Banner -->
          <div class="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
            <Icon name="i-lucide-target" class="size-4 shrink-0 text-amber-600" />
            <p class="text-xs font-medium">
              <span class="text-amber-700 dark:text-amber-400">Highlighting <strong>{{ item?.item }}</strong><span v-if="item?.itemSKU"> ({{ item.itemSKU }})</span> in this invoice.</span>
              <span class="text-muted-foreground ml-1">Scroll down to see the highlighted row.</span>
            </p>
          </div>

          <!-- Loading -->
          <div v-if="poDialogLoading" class="flex items-center justify-center py-16">
            <div class="flex flex-col items-center gap-3">
              <Icon name="i-lucide-loader-2" class="size-8 text-primary animate-spin" />
              <p class="text-sm text-muted-foreground">Loading purchase order…</p>
            </div>
          </div>

          <template v-else-if="poData">
            <!-- Invoice Header Grid -->
            <div>
              <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Invoice Header</h3>
              <div class="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <div class="space-y-1">
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Vendor Name</p>
                  <p class="text-sm font-medium">{{ poData.vendorName || '—' }}</p>
                </div>
                <div class="space-y-1">
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Invoice #</p>
                  <p class="text-sm font-mono font-medium">{{ poData.invoiceNumber || '—' }}</p>
                </div>
                <div class="space-y-1">
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Invoice Date</p>
                  <p class="text-sm font-medium">{{ poData.invoiceDate ? formatDateMDY(poData.invoiceDate) : '—' }}</p>
                </div>
                <div class="space-y-1">
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Delivery Date</p>
                  <p class="text-sm font-medium">{{ poData.deliveryDate ? formatDateMDY(poData.deliveryDate) : '—' }}</p>
                </div>
                <div class="space-y-1">
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Payment Due</p>
                  <p class="text-sm font-medium">{{ poData.paymentDueDate ? formatDateMDY(poData.paymentDueDate) : '—' }}</p>
                </div>
                <div class="space-y-1">
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Order #</p>
                  <p class="text-sm font-medium">{{ poData.orderNumber || '—' }}</p>
                </div>
                <div class="space-y-1">
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">PO #</p>
                  <p class="text-sm font-medium">{{ poData.poNumber || '—' }}</p>
                </div>
                <div class="space-y-1">
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Customer #</p>
                  <p class="text-sm font-medium">{{ poData.customerNumber || '—' }}</p>
                </div>
                <div class="space-y-1">
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Location</p>
                  <p class="text-sm font-medium">{{ poData.locationName || '—' }}</p>
                </div>
              </div>
            </div>

            <Separator />

            <!-- Line Items Table -->
            <div>
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Line Items ({{ poData.lineItems?.length || 0 }})
                </h3>
              </div>
              <div class="border rounded-lg overflow-visible">
                <div class="overflow-x-auto overflow-y-visible">
                  <table class="w-full text-xs table-fixed">
                    <colgroup>
                      <col class="w-[36px]" />
                      <col class="w-[110px]" />
                      <col />
                      <col class="w-[90px]" />
                      <col class="w-[70px]" />
                      <col class="w-[60px]" />
                      <col class="w-[85px]" />
                      <col class="w-[90px]" />
                      <col />
                    </colgroup>
                    <thead class="bg-muted/50">
                      <tr>
                        <th class="px-3 py-2 text-left font-medium text-muted-foreground">#</th>
                        <th class="px-3 py-2 text-left font-medium text-muted-foreground">Vendor Code</th>
                        <th class="px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
                        <th class="px-3 py-2 text-left font-medium text-muted-foreground">Category</th>
                        <th class="px-3 py-2 text-left font-medium text-muted-foreground">Qty</th>
                        <th class="px-3 py-2 text-left font-medium text-muted-foreground">Unit</th>
                        <th class="px-3 py-2 text-left font-medium text-muted-foreground">Unit $</th>
                        <th class="px-3 py-2 text-left font-medium text-muted-foreground">Ext $</th>
                        <th class="px-3 py-2 text-left font-medium text-muted-foreground">Our SKU</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y">
                      <template v-for="(group, gi) in poLineGroups" :key="gi">
                        <!-- Category row -->
                        <tr class="bg-muted/30">
                          <td colspan="9" class="px-3 py-1.5">
                            <span class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{{ group.category }}</span>
                          </td>
                        </tr>
                        <!-- Line rows -->
                        <tr
                          v-for="li in group.items"
                          :id="li.mappedItemId === itemId ? 'po-dialog-row-' + li.mappedItemId : undefined"
                          :key="li.lineNumber"
                          class="transition-all duration-1000"
                          :class="li.mappedItemId === itemId && highlightedItemId === itemId
                            ? 'bg-amber-400/30 dark:bg-amber-500/30 ring-2 ring-inset ring-primary/80 animate-pulse'
                            : li.skuLinked ? 'bg-emerald-50/30 dark:bg-emerald-900/10 hover:bg-muted/20' : 'hover:bg-muted/20'"
                        >
                          <td class="px-3 py-1.5 text-muted-foreground text-center">{{ li.lineNumber }}</td>
                          <td class="px-3 py-1.5 font-mono">{{ li.vendorItemCode || '—' }}</td>
                          <td class="px-3 py-1.5 font-medium truncate" :title="li.description">{{ li.description || '—' }}</td>
                          <td class="px-3 py-1.5 text-muted-foreground truncate">{{ li.category || '—' }}</td>
                          <td class="px-3 py-1.5 tabular-nums">{{ li.quantity }}</td>
                          <td class="px-3 py-1.5 text-muted-foreground">{{ li.unit || '—' }}</td>
                          <td class="px-3 py-1.5 tabular-nums">{{ fmt(li.unitPrice) }}</td>
                          <td class="px-3 py-1.5 font-mono font-semibold tabular-nums whitespace-nowrap">{{ fmt(li.extendedPrice) }}</td>
                          <td class="px-3 py-1.5">
                            <NuxtLink
                              v-if="li.skuLinked && li.mappedItemId"
                              :to="`/inventory/items/${li.mappedItemId}`"
                              class="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 rounded text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-800/40 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors text-[10px] font-medium max-w-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              :class="li.mappedItemId === itemId ? 'ring-2 ring-amber-400' : ''"
                              title="View Item Details"
                            >
                              <Icon name="i-lucide-arrow-right" class="size-2.5 shrink-0" />
                              <span class="truncate font-semibold">{{ li.mappedItemName || '—' }}</span>
                              <span v-if="li.mappedSku" class="opacity-70 ml-0.5">({{ li.mappedSku }})</span>
                            </NuxtLink>
                            <span v-else class="text-muted-foreground/40">Select SKU...</span>
                          </td>
                        </tr>
                      </template>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <Separator />

            <!-- Financials -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div />
              <div class="space-y-2">
                <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Invoice Totals</h3>
                <div class="space-y-2 bg-muted/30 rounded-xl p-4">
                  <div class="flex justify-between text-sm">
                    <span class="text-muted-foreground">Subtotal</span>
                    <span class="font-medium tabular-nums">{{ fmt(poData.subTotal) }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-muted-foreground">Tax</span>
                    <span class="tabular-nums">{{ fmt(poData.taxTotal) }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-muted-foreground">Other Charges</span>
                    <span class="tabular-nums">{{ fmt(poData.otherCharges) }}</span>
                  </div>
                  <Separator />
                  <div class="flex justify-between items-center">
                    <span class="font-semibold text-sm">Invoice Total</span>
                    <span class="text-lg font-bold tabular-nums">{{ fmt(poData.invoiceTotal) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
