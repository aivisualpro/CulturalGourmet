<script setup lang="ts">
import { toast } from 'vue-sonner'
import { HEADER_ACTIONS_ID } from '~/composables/usePageHeader'
import { getUnitAbbr } from '~/constants/units'

const { setHeader } = usePageHeader()
setHeader({ title: 'Transfers', icon: 'i-lucide-arrow-left-right' })

// ─── Constants & Formatters ─────────────────────────────────
function fmtDate(v: string | Date) {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
}

// ─── Store & Data ───────────────────────────────────────────
const { items, locations, ready: storeReady, fetchItems, fetchLocations } = useDataStore()

const { data: transfersData, pending: transfersLoading, refresh: refreshTransfers } = await useFetch<any[]>('/api/transfers')
const transfers = computed(() => transfersData.value || [])

onMounted(async () => {
  if (!locations.value.length) await fetchLocations()
  if (!items.value.length) await fetchItems()
})

const loading = computed(() => !storeReady.value || transfersLoading.value)
const search = ref('')

// ─── Computed ───────────────────────────────────────────────
const filteredTransfers = computed(() => {
  if (!search.value) return transfers.value
  const q = search.value.toLowerCase()
  return transfers.value.filter(t =>
    t.sourceLocationName?.toLowerCase().includes(q)
    || t.destinationLocationName?.toLowerCase().includes(q)
    || t.notes?.toLowerCase().includes(q)
  )
})

// ─── Dialog State ───────────────────────────────────────────
const showDialog = ref(false)
const saving = ref(false)
const deletingTransfer = ref<string | null>(null)
const showDeleteDialog = ref(false)

const draftTransfer = ref({
  date: new Date().toISOString().split('T')[0],
  sourceLocationId: '',
  destinationLocationId: '',
  notes: '',
  lineItems: [] as any[],
})

function resetDraft() {
  draftTransfer.value = {
    date: new Date().toISOString().split('T')[0],
    sourceLocationId: '',
    destinationLocationId: '',
    notes: '',
    lineItems: [] as any[],
  }
}

function openCreate() {
  resetDraft()
  showDialog.value = true
}

// ─── Transfer Actions ───────────────────────────────────────
function addRow() {
  draftTransfer.value.lineItems.push({
    lineNumber: draftTransfer.value.lineItems.length + 1,
    itemId: '',
    itemName: '',
    itemSKU: '',
    quantity: 1,
    unit: '',
  })
}

function removeRow(idx: number) {
  draftTransfer.value.lineItems.splice(idx, 1)
  // Re-number
  draftTransfer.value.lineItems.forEach((li: any, i: number) => { li.lineNumber = i + 1 })
}

function onItemSelected(idx: number, itemId: string) {
  const line = draftTransfer.value.lineItems[idx]
  const itm = items.value.find((i: any) => String(i._id) === String(itemId))
  if (itm) {
    line.itemId = String(itm._id)
    line.itemName = itm.item
    line.itemSKU = itm.itemSKU
    line.unit = itm.unit
  }
}

async function handleSave() {
  if (!draftTransfer.value.sourceLocationId) { toast.error('Source Location required'); return }
  if (!draftTransfer.value.destinationLocationId) { toast.error('Destination Location required'); return }
  if (draftTransfer.value.sourceLocationId === draftTransfer.value.destinationLocationId) { toast.error('Locations must be different'); return }
  
  const validItems = draftTransfer.value.lineItems.filter((li: any) => li.itemId && li.quantity > 0)
  if (validItems.length === 0) { toast.error('Add at least one valid item line to transfer'); return }

  const srcLoc = locations.value.find((l: any) => String(l._id) === draftTransfer.value.sourceLocationId)
  const destLoc = locations.value.find((l: any) => String(l._id) === draftTransfer.value.destinationLocationId)

  saving.value = true
  const payload = {
    ...draftTransfer.value,
    sourceLocationName: srcLoc?.name || 'Unknown',
    destinationLocationName: destLoc?.name || 'Unknown',
    lineItems: validItems,
    totalItems: validItems.length,
    status: 'completed'
  }

  try {
    await $fetch('/api/transfers', { method: 'POST', body: payload })
    toast.success('Transfer logged successfully')
    showDialog.value = false
    await refreshTransfers()
  } catch (err: any) {
    toast.error(err.data?.message || 'Failed to record transfer')
  } finally {
    saving.value = false
  }
}

function confirmDelete(id: string) {
  deletingTransfer.value = id
  showDeleteDialog.value = true
}

async function handleDelete() {
  if (!deletingTransfer.value) return
  try {
    await $fetch(`/api/transfers/${deletingTransfer.value}`, { method: 'DELETE' })
    toast.success('Transfer deleted & reverted')
    showDeleteDialog.value = false
    deletingTransfer.value = null
    await refreshTransfers()
  } catch {
    toast.error('Failed to delete transfer')
  }
}

</script>

<template>
  <ClientOnly>
    <Teleport :to="`#${HEADER_ACTIONS_ID}`" defer>
      <div class="flex items-center gap-2">
        <div class="relative hidden sm:block">
          <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input v-model="search" placeholder="Search transfers..." class="pl-8 h-8 w-48 lg:w-64 text-xs" />
        </div>
        <p class="text-xs text-muted-foreground tabular-nums whitespace-nowrap hidden md:block">
          {{ filteredTransfers.length }} transfer{{ filteredTransfers.length !== 1 ? 's' : '' }}
        </p>
        <Button variant="ghost" size="sm" class="h-8 text-xs" @click="refreshTransfers">
          <Icon name="i-lucide-rotate-ccw" class="mr-1 size-3.5" />Refresh
        </Button>
        <Button size="sm" class="h-8 text-xs" @click="openCreate">
          <Icon name="i-lucide-arrow-left-right" class="mr-1 size-3.5" />New Transfer
        </Button>
      </div>
    </Teleport>
  </ClientOnly>

  <div class="w-full flex flex-col gap-6">
    <div class="sm:hidden relative">
      <Icon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input v-model="search" placeholder="Search transfers..." class="pl-9" />
    </div>

    <!-- Table -->
    <Card v-if="loading" class="p-6">
      <div class="space-y-4">
        <Skeleton class="h-10 w-full" /><Skeleton class="h-10 w-full" /><Skeleton class="h-10 w-3/4" />
      </div>
    </Card>
    <Card v-else-if="filteredTransfers.length > 0">
      <div class="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="whitespace-nowrap">Date</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead class="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="t in filteredTransfers" :key="t._id" class="group">
              <TableCell class="font-medium tabular-nums whitespace-nowrap"><span class="text-sm">{{ fmtDate(t.date) }}</span></TableCell>
              <TableCell>
                <div class="flex items-center gap-1.5 min-w-[140px]">
                  <Icon name="i-lucide-log-out" class="size-3.5 text-rose-500 shrink-0" />
                  <span class="text-sm font-medium">{{ t.sourceLocationName }}</span>
                </div>
              </TableCell>
              <TableCell>
                <div class="flex items-center gap-1.5 min-w-[140px]">
                  <Icon name="i-lucide-log-in" class="size-3.5 text-emerald-500 shrink-0" />
                  <span class="text-sm font-medium">{{ t.destinationLocationName }}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" class="font-mono text-[10px]">{{ t.totalItems }} Line{{ t.totalItems !== 1 ? 's' : '' }}</Badge>
              </TableCell>
              <TableCell>
                <span class="text-sm text-muted-foreground line-clamp-1">{{ t.notes || '—' }}</span>
              </TableCell>
              <TableCell class="text-right">
                <Button variant="ghost" size="icon" class="size-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" @click.stop="confirmDelete(t._id)">
                  <Icon name="i-lucide-trash-2" class="size-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </Card>
    
    <Card v-else class="flex flex-col items-center justify-center p-12 text-center border-dashed">
      <div class="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon name="i-lucide-arrow-left-right" class="size-8 text-muted-foreground/50" />
      </div>
      <h3 class="text-lg font-semibold mb-1">No transfers found</h3>
      <p class="text-sm text-muted-foreground mb-6 max-w-sm">You haven't recorded any inventory transfers between locations yet.</p>
      <Button @click="openCreate"><Icon name="i-lucide-plus" class="mr-1.5 size-4" />Log a Transfer</Button>
    </Card>

    <!-- Create Transfer Dialog -->
    <Dialog v-model:open="showDialog">
      <DialogContent class="sm:max-w-[700px] w-full max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader class="p-5 border-b shrink-0 flex flex-row items-center justify-between">
          <div>
            <DialogTitle>Log Inventory Transfer</DialogTitle>
            <DialogDescription>Move items directly from one location's balance to another.</DialogDescription>
          </div>
        </DialogHeader>
        
        <div class="flex-1 overflow-y-auto p-5 bg-muted/10 space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <Label>Source (From)</Label>
              <Select v-model="draftTransfer.sourceLocationId">
                <SelectTrigger>
                  <SelectValue placeholder="Select outgoing location..." />
                </SelectTrigger>
                <SelectContent class="max-w-[calc(100vw-40px)] w-[var(--radix-select-trigger-width)]">
                  <SelectItem v-for="l in locations" :key="l._id" :value="String(l._id)">{{ l.name }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-1.5">
              <Label>Destination (To)</Label>
              <Select v-model="draftTransfer.destinationLocationId">
                <SelectTrigger>
                  <SelectValue placeholder="Select receiving location..." />
                </SelectTrigger>
                <SelectContent class="max-w-[calc(100vw-40px)] w-[var(--radix-select-trigger-width)]">
                  <SelectItem v-for="l in locations" :key="l._id" :value="String(l._id)">{{ l.name }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" v-model="draftTransfer.date" />
            </div>
            <div class="space-y-1.5">
              <Label>Notes (Optional)</Label>
              <Input v-model="draftTransfer.notes" placeholder="e.g. Replenishment" />
            </div>
          </div>

          <!-- Items Lines -->
          <div class="space-y-2">
            <div class="flex items-center justify-between pb-2 border-b">
              <h4 class="text-sm font-medium">Items to Transfer</h4>
              <Button type="button" variant="outline" size="sm" class="h-8 text-xs bg-background" @click="addRow">
                <Icon name="i-lucide-plus" class="mr-1 size-3.5" />Add Item Row
              </Button>
            </div>

            <div v-if="draftTransfer.lineItems.length === 0" class="py-10 text-center border border-dashed rounded-lg bg-background">
              <p class="text-sm text-muted-foreground mb-4">No items added to this transfer yet.</p>
              <Button type="button" variant="secondary" size="sm" @click="addRow">
                <Icon name="i-lucide-plus" class="mr-1.5 size-3.5" />Add First Item
              </Button>
            </div>

            <div v-for="(line, idx) in draftTransfer.lineItems" :key="idx" class="flex flex-col sm:flex-row gap-3 items-start sm:items-center p-3 rounded-lg border bg-background shadow-sm">
              <div class="flex-1 w-full min-w-[200px]">
                <Select
                  :model-value="line.itemId"
                  @update:model-value="(val) => onItemSelected(idx, val as string)"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Inventory Item...">
                      <div v-if="line.itemName" class="flex gap-2">
                        <span>{{ line.itemName }}</span>
                        <span class="text-muted-foreground text-[10px] mt-[3px]">{{ line.itemSKU }}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent class="max-w-[calc(100vw-40px)] w-[var(--radix-select-trigger-width)] z-[60]">
                    <SelectItem v-for="itm in items" :key="itm._id" :value="String(itm._id)">
                      {{ itm.item }} <span class="text-muted-foreground font-mono text-xs ml-2">{{ itm.itemSKU }}</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="flex gap-2 w-full sm:w-auto h-9">
                <div class="relative w-24">
                  <Input type="number" v-model="line.quantity" step="0.01" min="0" class="pr-6 h-9 tabular-nums text-right" />
                </div>
                <!-- Mini Unit Dropdown -->
                <div class="w-32 shrink-0">
                  <UnitSelect v-model="line.unit" class="h-9" :placeholder="line.unit ? getUnitAbbr(line.unit) : 'Unit'" />
                </div>
                <Button type="button" variant="ghost" size="icon" class="size-9 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10" @click="removeRow(idx)">
                  <Icon name="i-lucide-x" class="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter class="p-5 border-t shrink-0 flex items-center justify-between sm:justify-between bg-muted/20">
          <div class="text-[11px] text-muted-foreground font-medium hidden sm:block">
            Transferring {{ draftTransfer.lineItems.length }} item logs
          </div>
          <div class="flex space-x-2">
            <Button variant="outline" type="button" @click="showDialog = false">Cancel</Button>
            <Button type="button" class="min-w-[120px]" @click="handleSave" :disabled="saving">
              <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 size-4 animate-spin" />
              <Icon v-else name="i-lucide-check" class="mr-2 size-4" />
              Complete Transfer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Delete Alert -->
    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>This will delete the transfer and immediately revert the inventory balances for all involved locations. This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="handleDelete">Delete Revert</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
