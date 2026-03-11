<script setup lang="ts">
import { toast } from 'vue-sonner'
import { Plus } from 'lucide-vue-next'
import { HEADER_ACTIONS_ID } from '~/composables/usePageHeader'

const { setHeader } = usePageHeader()
setHeader({ title: 'Food Items', icon: 'i-lucide-chef-hat' })

// ─── State ──────────────────────────────────────────────────
const items = ref<any[]>([])
const vendors = ref<any[]>([])
const locations = ref<any[]>([])
const categories = ref<any[]>([])
const packSizes = ref<string[]>(['Pint', 'Case', 'EA', 'Bag'])
const loading = ref(true)
const search = ref('')
const showDialog = ref(false)
const showDeleteDialog = ref(false)
const showPackSizeDialog = ref(false)
const editingItem = ref<any>(null)
const deletingItem = ref<any>(null)
const saving = ref(false)
const newPackSize = ref('')

const defaultForm = () => ({
  sku: '',
  vendor: '',
  location: '',
  description: '',
  item: '',
  packSize: '',
  unitQty: 0,
  caseQty: 0,
  unitPrice: 0,
  casePrice: 0,
  onHand: 0,
  par: 0,
  order: 0,
  received: 0,
})

const formData = ref(defaultForm())

// ─── Fetch ──────────────────────────────────────────────────
async function fetchItems() {
  loading.value = true
  try { items.value = await $fetch('/api/food-items') }
  catch { toast.error('Failed to load food items') }
  finally { loading.value = false }
}

async function fetchLookups() {
  const [v, l, c] = await Promise.all([
    $fetch('/api/vendors'),
    $fetch('/api/locations'),
    $fetch('/api/categories'),
  ])
  vendors.value = v as any[]
  locations.value = l as any[]
  categories.value = c as any[]
}

onMounted(async () => {
  await Promise.all([fetchItems(), fetchLookups()])
})

// ─── Computed ───────────────────────────────────────────────
const filtered = computed(() => {
  if (!search.value) return items.value
  const q = search.value.toLowerCase()
  return items.value.filter((i: any) =>
    i.item?.toLowerCase().includes(q)
    || i.sku?.toLowerCase().includes(q)
    || i.vendor?.vendorName?.toLowerCase().includes(q)
    || i.location?.name?.toLowerCase().includes(q)
    || i.description?.name?.toLowerCase().includes(q)
    || i.packSize?.toLowerCase().includes(q),
  )
})

// ─── CRUD ───────────────────────────────────────────────────
function openCreate() {
  editingItem.value = null
  formData.value = defaultForm()
  showDialog.value = true
}

function openEdit(item: any) {
  editingItem.value = item
  formData.value = {
    sku: item.sku || '',
    vendor: item.vendor?._id || item.vendor || '',
    location: item.location?._id || item.location || '',
    description: item.description?._id || item.description || '',
    item: item.item || '',
    packSize: item.packSize || '',
    unitQty: item.unitQty || 0,
    caseQty: item.caseQty || 0,
    unitPrice: item.unitPrice || 0,
    casePrice: item.casePrice || 0,
    onHand: item.onHand || 0,
    par: item.par || 0,
    order: item.order || 0,
    received: item.received || 0,
  }
  showDialog.value = true
}

async function handleSave() {
  if (!formData.value.item.trim()) { toast.error('Item name is required'); return }
  saving.value = true

  const payload = {
    ...formData.value,
    vendor: formData.value.vendor || null,
    location: formData.value.location || null,
    description: formData.value.description || null,
  }

  try {
    if (editingItem.value) {
      await $fetch(`/api/food-items/${editingItem.value._id}`, { method: 'PUT', body: payload })
      toast.success('Food item updated')
    }
    else {
      await $fetch('/api/food-items', { method: 'POST', body: payload })
      toast.success('Food item created')
    }
    showDialog.value = false
    await fetchItems()
  }
  catch { toast.error('Failed to save food item') }
  finally { saving.value = false }
}

function confirmDelete(item: any) { deletingItem.value = item; showDeleteDialog.value = true }

async function handleDelete() {
  if (!deletingItem.value) return
  try {
    await $fetch(`/api/food-items/${deletingItem.value._id}`, { method: 'DELETE' })
    toast.success('Food item deleted')
    showDeleteDialog.value = false
    deletingItem.value = null
    await fetchItems()
  }
  catch { toast.error('Failed to delete food item') }
}

function addCustomPackSize() {
  if (!newPackSize.value.trim()) return
  if (!packSizes.value.includes(newPackSize.value.trim())) {
    packSizes.value.push(newPackSize.value.trim())
  }
  formData.value.packSize = newPackSize.value.trim()
  newPackSize.value = ''
  showPackSizeDialog.value = false
}

async function handleReset() { search.value = ''; await fetchItems(); toast.info('Refreshed') }

function formatCurrency(val: number) {
  return val ? `$${val.toFixed(2)}` : '—'
}
</script>

<template>
  <Teleport :to="`#${HEADER_ACTIONS_ID}`">
    <div class="flex items-center gap-2">
      <div class="relative hidden sm:block">
        <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input v-model="search" placeholder="Search food items..." class="pl-8 h-8 w-48 lg:w-64 text-xs" />
      </div>
      <p class="text-xs text-muted-foreground tabular-nums whitespace-nowrap hidden md:block">
        {{ filtered.length }} item{{ filtered.length !== 1 ? 's' : '' }}
      </p>
      <Button variant="ghost" size="sm" class="h-8 text-xs" @click="handleReset">
        <Icon name="i-lucide-rotate-ccw" class="mr-1 size-3.5" />Reset
      </Button>
      <Button size="sm" class="h-8 text-xs" @click="openCreate">
        <Icon name="i-lucide-plus" class="mr-1 size-3.5" />Add Item
      </Button>
    </div>
  </Teleport>

  <div class="w-full flex flex-col gap-6">
    <div class="sm:hidden relative">
      <Icon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input v-model="search" placeholder="Search food items..." class="pl-9" />
    </div>

    <!-- Loading -->
    <Card v-if="loading" class="p-6">
      <div class="space-y-4"><Skeleton class="h-10 w-full" /><Skeleton class="h-10 w-full" /><Skeleton class="h-10 w-full" /><Skeleton class="h-10 w-3/4" /></div>
    </Card>

    <!-- Table -->
    <Card v-else>
      <div class="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Pack Size</TableHead>
              <TableHead class="text-right">Unit Qty</TableHead>
              <TableHead class="text-right">Case Qty</TableHead>
              <TableHead class="text-right">Unit Price</TableHead>
              <TableHead class="text-right">Case Price</TableHead>
              <TableHead class="text-right">On Hand</TableHead>
              <TableHead class="text-right">Par</TableHead>
              <TableHead class="text-right">Order</TableHead>
              <TableHead class="text-right">Received</TableHead>
              <TableHead class="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="fi in filtered" :key="fi._id" class="group">
              <TableCell><span class="text-sm font-mono">{{ fi.sku || '—' }}</span></TableCell>
              <TableCell><span class="font-medium text-sm">{{ fi.item }}</span></TableCell>
              <TableCell>
                <Badge v-if="fi.vendor?.vendorName" variant="outline" class="text-xs font-normal">{{ fi.vendor.vendorName }}</Badge>
                <span v-else class="text-muted-foreground text-sm">—</span>
              </TableCell>
              <TableCell>
                <Badge v-if="fi.location?.name" variant="secondary" class="text-xs font-normal">{{ fi.location.name }}</Badge>
                <span v-else class="text-muted-foreground text-sm">—</span>
              </TableCell>
              <TableCell>
                <Badge v-if="fi.description?.name" variant="outline" class="text-xs font-normal">{{ fi.description.name }}</Badge>
                <span v-else class="text-muted-foreground text-sm">—</span>
              </TableCell>
              <TableCell><span class="text-sm">{{ fi.packSize || '—' }}</span></TableCell>
              <TableCell class="text-right tabular-nums text-sm">{{ fi.unitQty || 0 }}</TableCell>
              <TableCell class="text-right tabular-nums text-sm">{{ fi.caseQty || 0 }}</TableCell>
              <TableCell class="text-right tabular-nums text-sm">{{ formatCurrency(fi.unitPrice) }}</TableCell>
              <TableCell class="text-right tabular-nums text-sm">{{ formatCurrency(fi.casePrice) }}</TableCell>
              <TableCell class="text-right tabular-nums text-sm font-medium">{{ fi.onHand || 0 }}</TableCell>
              <TableCell class="text-right tabular-nums text-sm">{{ fi.par || 0 }}</TableCell>
              <TableCell class="text-right tabular-nums text-sm">{{ fi.order || 0 }}</TableCell>
              <TableCell class="text-right tabular-nums text-sm">{{ fi.received || 0 }}</TableCell>
              <TableCell class="text-right">
                <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" class="size-8" @click="openEdit(fi)"><Icon name="i-lucide-pencil" class="size-3.5" /></Button>
                  <Button variant="ghost" size="icon" class="size-8 text-destructive hover:text-destructive" @click="confirmDelete(fi)"><Icon name="i-lucide-trash-2" class="size-3.5" /></Button>
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-if="filtered.length === 0">
              <TableCell :colspan="15" class="h-32 text-center">
                <div class="flex flex-col items-center gap-2 text-muted-foreground">
                  <Icon name="i-lucide-inbox" class="size-8" /><p>No food items found</p>
                  <Button size="sm" variant="outline" @click="openCreate"><Icon name="i-lucide-plus" class="mr-1 size-4" />Add Item</Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </Card>

    <!-- Create/Edit Dialog -->
    <Dialog v-model:open="showDialog">
      <DialogContent class="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ editingItem ? 'Edit' : 'New' }} Food Item</DialogTitle>
          <DialogDescription class="sr-only">{{ editingItem ? 'Edit' : 'Create' }} a food item</DialogDescription>
        </DialogHeader>
        <form class="space-y-5" @submit.prevent="handleSave">
          <!-- Row 1: Item + SKU -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="fiItem">Item <span class="text-destructive">*</span></Label>
              <Input id="fiItem" v-model="formData.item" placeholder="e.g. Chicken Breast" />
            </div>
            <div class="space-y-2">
              <Label for="fiSku">SKU</Label>
              <Input id="fiSku" v-model="formData.sku" placeholder="e.g. CB-001" />
            </div>
          </div>

          <!-- Row 2: Vendor + Location + Description(Category) -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="space-y-2">
              <Label>Vendor</Label>
              <select v-model="formData.vendor" class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="">— Select —</option>
                <option v-for="v in vendors" :key="v._id" :value="v._id">{{ v.vendorName }}</option>
              </select>
            </div>
            <div class="space-y-2">
              <Label>Location</Label>
              <select v-model="formData.location" class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="">— Select —</option>
                <option v-for="l in locations" :key="l._id" :value="l._id">{{ l.name }}</option>
              </select>
            </div>
            <div class="space-y-2">
              <Label>Description (Category)</Label>
              <select v-model="formData.description" class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="">— Select —</option>
                <option v-for="c in categories" :key="c._id" :value="c._id">{{ c.name }}</option>
              </select>
            </div>
          </div>

          <!-- Row 3: Pack Size + Quantities -->
          <Separator />
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div class="space-y-2">
              <Label>Pack Size</Label>
              <div class="flex gap-2">
                <select v-model="formData.packSize" class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="">— Select —</option>
                  <option v-for="ps in packSizes" :key="ps" :value="ps">{{ ps }}</option>
                </select>
                <Button type="button" variant="outline" size="icon" class="shrink-0 size-9" @click="showPackSizeDialog = true">
                  <Plus class="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div class="space-y-2">
              <Label for="fiUnitQty">Unit (QTY)</Label>
              <Input id="fiUnitQty" v-model.number="formData.unitQty" type="number" min="0" />
            </div>
            <div class="space-y-2">
              <Label for="fiCaseQty">Case (QTY)</Label>
              <Input id="fiCaseQty" v-model.number="formData.caseQty" type="number" min="0" />
            </div>
          </div>

          <!-- Row 4: Prices -->
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="fiUnitPrice">Unit Price ($)</Label>
              <Input id="fiUnitPrice" v-model.number="formData.unitPrice" type="number" min="0" step="0.01" />
            </div>
            <div class="space-y-2">
              <Label for="fiCasePrice">Case Price ($)</Label>
              <Input id="fiCasePrice" v-model.number="formData.casePrice" type="number" min="0" step="0.01" />
            </div>
          </div>

          <!-- Row 5: Inventory -->
          <Separator />
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div class="space-y-2">
              <Label for="fiOnHand">On Hand</Label>
              <Input id="fiOnHand" v-model.number="formData.onHand" type="number" min="0" />
            </div>
            <div class="space-y-2">
              <Label for="fiPar">Par</Label>
              <Input id="fiPar" v-model.number="formData.par" type="number" min="0" />
            </div>
            <div class="space-y-2">
              <Label for="fiOrder">Order</Label>
              <Input id="fiOrder" v-model.number="formData.order" type="number" min="0" />
            </div>
            <div class="space-y-2">
              <Label for="fiReceived">Received</Label>
              <Input id="fiReceived" v-model.number="formData.received" type="number" min="0" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" @click="showDialog = false">Cancel</Button>
            <Button type="submit" :disabled="saving">
              <Icon v-if="saving" name="i-lucide-loader-2" class="mr-1 size-4 animate-spin" />
              {{ editingItem ? 'Update' : 'Create' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Add Pack Size Dialog -->
    <Dialog v-model:open="showPackSizeDialog">
      <DialogContent class="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>Add Pack Size</DialogTitle>
          <DialogDescription class="sr-only">Add a custom pack size</DialogDescription>
        </DialogHeader>
        <form @submit.prevent="addCustomPackSize">
          <div class="space-y-2 mb-4">
            <Label for="newPs">Pack Size Name</Label>
            <Input id="newPs" v-model="newPackSize" placeholder="e.g. Gallon, Tub, Box..." />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" @click="showPackSizeDialog = false">Cancel</Button>
            <Button type="submit">Add</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Delete Confirmation -->
    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Food Item?</AlertDialogTitle>
          <AlertDialogDescription>This will permanently delete <strong>{{ deletingItem?.item }}</strong>. This action cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="handleDelete">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
