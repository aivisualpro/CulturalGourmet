<script setup lang="ts">
import { toast } from 'vue-sonner'
import { getUnitAbbr } from '~/constants/units'
import { HEADER_ACTIONS_ID } from '~/composables/usePageHeader'

const { setHeader } = usePageHeader()
setHeader({ title: 'Prep', icon: 'i-lucide-cooking-pot' })

// ─── Global Data Store ──────────────────────────────────────
const { preps: prepEntries, locations: stations, prepList: prepItems, ready: storeReady, fetchPreps } = useDataStore()
const loading = computed(() => !storeReady.value)
const search = ref('')
const showDialog = ref(false)
const showDeleteDialog = ref(false)
const editingEntry = ref<any>(null)
const deletingEntry = ref<any>(null)
const saving = ref(false)

// Active station tab – 'all' plus each station name
const activeStation = ref('all')

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

// ─── Station Tabs ───────────────────────────────────────────
const stationTabs = computed(() => {
  const tabs = [{ key: 'all', label: 'All Stations' }]
  stations.value.forEach((s: any) => {
    tabs.push({ key: s.name, label: s.name })
  })
  return tabs
})

// ─── Computed ───────────────────────────────────────────────
const filtered = computed(() => {
  let list = prepEntries.value

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

// Count per station (for badge)
const stationCounts = computed(() => {
  const counts: Record<string, number> = { all: prepEntries.value.length }
  prepEntries.value.forEach((e: any) => {
    counts[e.station] = (counts[e.station] || 0) + 1
  })
  return counts
})

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
      <div class="relative hidden sm:block">
        <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input v-model="search" placeholder="Search prep..." class="pl-8 h-8 w-48 lg:w-64 text-xs" />
      </div>
      <p class="text-xs text-muted-foreground tabular-nums whitespace-nowrap hidden md:block">
        {{ filtered.length }} record{{ filtered.length !== 1 ? 's' : '' }}
      </p>

      <Button size="sm" class="h-8 text-xs" @click="openCreate">
        <Icon name="i-lucide-plus" class="mr-1 size-3.5" />Add Prep
      </Button>
    </div>
    </Teleport>
  </ClientOnly>

  <div class="w-full flex flex-col gap-5">
    <!-- Mobile Search -->
    <div class="sm:hidden relative">
      <Icon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input v-model="search" placeholder="Search prep..." class="pl-9" />
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

    <!-- Loading -->
    <Card v-if="loading" class="p-6">
      <div class="space-y-4">
        <Skeleton class="h-10 w-full" />
        <Skeleton class="h-10 w-full" />
        <Skeleton class="h-10 w-full" />
        <Skeleton class="h-10 w-3/4" />
      </div>
    </Card>

    <!-- Table -->
    <Card v-else-if="filtered.length > 0">
      <div class="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="text-xs font-semibold w-[50px]">#</TableHead>
              <TableHead class="text-xs font-semibold">Date</TableHead>
              <TableHead class="text-xs font-semibold">Station</TableHead>
              <TableHead class="text-xs font-semibold">Item</TableHead>
              <TableHead class="text-xs font-semibold">Description</TableHead>
              <TableHead class="text-xs font-semibold text-right">Qty</TableHead>
              <TableHead class="text-xs font-semibold">Unit</TableHead>
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
              <TableCell class="text-sm tabular-nums whitespace-nowrap">
                <div class="flex items-center gap-1.5">
                  <Icon name="i-lucide-calendar" class="size-3 text-muted-foreground shrink-0" />
                  {{ formatDate(entry.date) }}
                </div>
              </TableCell>
              <TableCell>
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-foreground">
                  <Icon name="i-lucide-map-pin" class="size-3 text-primary" />
                  {{ entry.station }}
                </span>
              </TableCell>
              <TableCell class="font-medium">{{ entry.item }}</TableCell>
              <TableCell>
                <span v-if="entry.description" class="text-sm max-w-[200px] truncate block">{{ entry.description }}</span>
                <span v-else class="text-muted-foreground text-sm">—</span>
              </TableCell>
              <TableCell class="text-right tabular-nums">
                {{ entry.qty ?? '—' }}
              </TableCell>
              <TableCell>
                <span v-if="entry.unit" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 border border-border/50 text-xs font-medium">
                  <Icon name="i-lucide-ruler" class="size-3 text-muted-foreground" />
                  {{ getUnitAbbr(entry.unit) }}
                </span>
                <span v-else class="text-muted-foreground text-sm">—</span>
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
          <h3 class="text-lg font-semibold">No prep entries yet</h3>
          <p class="text-sm text-muted-foreground mt-1">
            {{ activeStation !== 'all' ? `No prep entries for "${activeStation}".` : 'Add your first prep entry to get started.' }}
          </p>
        </div>
        <Button @click="openCreate">
          <Icon name="i-lucide-plus" class="mr-1.5 size-4" />Add Prep
        </Button>
      </div>
    </Card>

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
