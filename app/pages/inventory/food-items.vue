<script setup lang="ts">
import { toast } from 'vue-sonner'
import { Plus, Search as SearchIcon, Check, ChevronsUpDown } from 'lucide-vue-next'
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
const editingItem = ref<any>(null)
const deletingItem = ref<any>(null)
const saving = ref(false)

// Vendor dropdown
const vendorOpen = ref(false)
const vendorSearch = ref('')
const showAddVendorDialog = ref(false)
const newVendorName = ref('')

// Location dropdown
const locationOpen = ref(false)
const locationSearch = ref('')
const showAddLocationDialog = ref(false)
const newLocationName = ref('')

// Category dropdown
const categoryOpen = ref(false)
const categorySearch = ref('')
const showAddCategoryDialog = ref(false)
const newCategoryName = ref('')

// Pack Size dropdown
const packSizeOpen = ref(false)
const packSizeSearch = ref('')
const showAddPackSizeDialog = ref(false)
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
  par: 0,
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

const filteredVendors = computed(() => {
  if (!vendorSearch.value) return vendors.value
  const q = vendorSearch.value.toLowerCase()
  return vendors.value.filter((v: any) => v.vendorName?.toLowerCase().includes(q))
})

const filteredLocations = computed(() => {
  if (!locationSearch.value) return locations.value
  const q = locationSearch.value.toLowerCase()
  return locations.value.filter((l: any) => l.name?.toLowerCase().includes(q))
})

const filteredCategories = computed(() => {
  if (!categorySearch.value) return categories.value
  const q = categorySearch.value.toLowerCase()
  return categories.value.filter((c: any) => c.name?.toLowerCase().includes(q))
})

const filteredPackSizes = computed(() => {
  if (!packSizeSearch.value) return packSizes.value
  const q = packSizeSearch.value.toLowerCase()
  return packSizes.value.filter(ps => ps.toLowerCase().includes(q))
})

const selectedVendorName = computed(() => {
  const v = vendors.value.find((v: any) => v._id === formData.value.vendor)
  return v?.vendorName || ''
})

const selectedLocationName = computed(() => {
  const l = locations.value.find((l: any) => l._id === formData.value.location)
  return l?.name || ''
})

const selectedCategoryName = computed(() => {
  const c = categories.value.find((c: any) => c._id === formData.value.description)
  return c?.name || ''
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
    par: item.par || 0,
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

// ─── Quick Add ──────────────────────────────────────────────
async function addQuickVendor() {
  if (!newVendorName.value.trim()) return
  try {
    const created: any = await $fetch('/api/vendors', { method: 'POST', body: { vendorName: newVendorName.value.trim() } })
    vendors.value.push(created)
    formData.value.vendor = created._id
    toast.success(`Vendor "${created.vendorName}" created`)
    newVendorName.value = ''
    showAddVendorDialog.value = false
  }
  catch { toast.error('Failed to create vendor') }
}

async function addQuickLocation() {
  if (!newLocationName.value.trim()) return
  try {
    const created: any = await $fetch('/api/locations', { method: 'POST', body: { name: newLocationName.value.trim() } })
    locations.value.push(created)
    formData.value.location = created._id
    toast.success(`Location "${created.name}" created`)
    newLocationName.value = ''
    showAddLocationDialog.value = false
  }
  catch { toast.error('Failed to create location') }
}

async function addQuickCategory() {
  if (!newCategoryName.value.trim()) return
  try {
    const created: any = await $fetch('/api/categories', { method: 'POST', body: { name: newCategoryName.value.trim() } })
    categories.value.push(created)
    formData.value.description = created._id
    toast.success(`Category "${created.name}" created`)
    newCategoryName.value = ''
    showAddCategoryDialog.value = false
  }
  catch { toast.error('Failed to create category') }
}

function addCustomPackSize() {
  if (!newPackSize.value.trim()) return
  if (!packSizes.value.includes(newPackSize.value.trim())) {
    packSizes.value.push(newPackSize.value.trim())
  }
  formData.value.packSize = newPackSize.value.trim()
  newPackSize.value = ''
  showAddPackSizeDialog.value = false
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
              <TableHead>Vendor</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Pack Size</TableHead>
              <TableHead class="text-right">Unit Qty</TableHead>
              <TableHead class="text-right">Case Qty</TableHead>
              <TableHead class="text-right">Unit Price</TableHead>
              <TableHead class="text-right">Case Price</TableHead>
              <TableHead class="text-right">On Hand</TableHead>
              <TableHead class="text-right">Par</TableHead>
              <TableHead class="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="fi in filtered" :key="fi._id" class="group">
              <TableCell><span class="text-sm font-mono">{{ fi.sku || '—' }}</span></TableCell>
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
              <TableCell><span class="font-medium text-sm">{{ fi.item }}</span></TableCell>
              <TableCell><span class="text-sm">{{ fi.packSize || '—' }}</span></TableCell>
              <TableCell class="text-right tabular-nums text-sm">{{ fi.unitQty || 0 }}</TableCell>
              <TableCell class="text-right tabular-nums text-sm">{{ fi.caseQty || 0 }}</TableCell>
              <TableCell class="text-right tabular-nums text-sm">{{ formatCurrency(fi.unitPrice) }}</TableCell>
              <TableCell class="text-right tabular-nums text-sm">{{ formatCurrency(fi.casePrice) }}</TableCell>
              <TableCell class="text-right tabular-nums text-sm font-medium">{{ fi.onHand || 0 }}</TableCell>
              <TableCell class="text-right tabular-nums text-sm">{{ fi.par || 0 }}</TableCell>
              <TableCell class="text-right">
                <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" class="size-8" @click="openEdit(fi)"><Icon name="i-lucide-pencil" class="size-3.5" /></Button>
                  <Button variant="ghost" size="icon" class="size-8 text-destructive hover:text-destructive" @click="confirmDelete(fi)"><Icon name="i-lucide-trash-2" class="size-3.5" /></Button>
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-if="filtered.length === 0">
              <TableCell :colspan="13" class="h-32 text-center">
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

    <!-- ═══ Create/Edit Dialog ═══ -->
    <Dialog v-model:open="showDialog">
      <DialogContent class="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ editingItem ? 'Edit' : 'New' }} Food Item</DialogTitle>
          <DialogDescription class="sr-only">{{ editingItem ? 'Edit' : 'Create' }} a food item</DialogDescription>
        </DialogHeader>
        <form class="space-y-5" @submit.prevent="handleSave">
          <!-- Row 1: SKU + Item -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="fiSku">SKU</Label>
              <Input id="fiSku" v-model="formData.sku" placeholder="e.g. CB-001" />
            </div>
            <div class="space-y-2">
              <Label for="fiItem">Item <span class="text-destructive">*</span></Label>
              <Input id="fiItem" v-model="formData.item" placeholder="e.g. Chicken Breast" />
            </div>
          </div>

          <!-- Row 2: Vendor + Location -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- ── Vendor Combobox ── -->
            <div class="space-y-2">
              <Label>Vendor</Label>
              <Popover v-model:open="vendorOpen">
                <PopoverTrigger as-child>
                  <Button variant="outline" role="combobox" :aria-expanded="vendorOpen" class="w-full justify-between h-9 font-normal">
                    <span :class="selectedVendorName ? '' : 'text-muted-foreground'">{{ selectedVendorName || 'Select vendor...' }}</span>
                    <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent class="w-[--radix-popover-trigger-width] p-0" align="start">
                  <div class="p-2 border-b">
                    <div class="relative">
                      <SearchIcon class="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input v-model="vendorSearch" class="w-full pl-7 pr-3 py-1.5 text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground" placeholder="Search vendors..." >
                    </div>
                  </div>
                  <div class="max-h-[200px] overflow-y-auto p-1">
                    <button type="button" class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-left" :class="!formData.vendor ? 'text-primary font-medium' : ''" @click="formData.vendor = ''; vendorOpen = false">
                      <span class="w-4 h-4 flex items-center justify-center"><Check v-if="!formData.vendor" class="w-3.5 h-3.5" /></span>
                      <span class="text-muted-foreground">None</span>
                    </button>
                    <button v-for="v in filteredVendors" :key="v._id" type="button" class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-left" :class="formData.vendor === v._id ? 'text-primary font-medium' : ''" @click="formData.vendor = v._id; vendorOpen = false">
                      <span class="w-4 h-4 flex items-center justify-center"><Check v-if="formData.vendor === v._id" class="w-3.5 h-3.5" /></span>
                      {{ v.vendorName }}
                    </button>
                    <div v-if="filteredVendors.length === 0 && vendorSearch" class="px-2 py-3 text-xs text-center text-muted-foreground">No vendors match "{{ vendorSearch }}"</div>
                  </div>
                  <div class="border-t p-1">
                    <button type="button" class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-primary font-medium" @click="vendorOpen = false; newVendorName = vendorSearch; showAddVendorDialog = true">
                      <Plus class="w-4 h-4" />Add new vendor
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <!-- ── Location Combobox ── -->
            <div class="space-y-2">
              <Label>Location</Label>
              <Popover v-model:open="locationOpen">
                <PopoverTrigger as-child>
                  <Button variant="outline" role="combobox" :aria-expanded="locationOpen" class="w-full justify-between h-9 font-normal">
                    <span :class="selectedLocationName ? '' : 'text-muted-foreground'">{{ selectedLocationName || 'Select location...' }}</span>
                    <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent class="w-[--radix-popover-trigger-width] p-0" align="start">
                  <div class="p-2 border-b">
                    <div class="relative">
                      <SearchIcon class="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input v-model="locationSearch" class="w-full pl-7 pr-3 py-1.5 text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground" placeholder="Search locations..." >
                    </div>
                  </div>
                  <div class="max-h-[200px] overflow-y-auto p-1">
                    <button type="button" class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-left" :class="!formData.location ? 'text-primary font-medium' : ''" @click="formData.location = ''; locationOpen = false">
                      <span class="w-4 h-4 flex items-center justify-center"><Check v-if="!formData.location" class="w-3.5 h-3.5" /></span>
                      <span class="text-muted-foreground">None</span>
                    </button>
                    <button v-for="l in filteredLocations" :key="l._id" type="button" class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-left" :class="formData.location === l._id ? 'text-primary font-medium' : ''" @click="formData.location = l._id; locationOpen = false">
                      <span class="w-4 h-4 flex items-center justify-center"><Check v-if="formData.location === l._id" class="w-3.5 h-3.5" /></span>
                      {{ l.name }}
                    </button>
                    <div v-if="filteredLocations.length === 0 && locationSearch" class="px-2 py-3 text-xs text-center text-muted-foreground">No locations match "{{ locationSearch }}"</div>
                  </div>
                  <div class="border-t p-1">
                    <button type="button" class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-primary font-medium" @click="locationOpen = false; newLocationName = locationSearch; showAddLocationDialog = true">
                      <Plus class="w-4 h-4" />Add new location
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <!-- Row 3: Description(Category) + Pack Size -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- ── Category Combobox ── -->
            <div class="space-y-2">
              <Label>Description (Category)</Label>
              <Popover v-model:open="categoryOpen">
                <PopoverTrigger as-child>
                  <Button variant="outline" role="combobox" :aria-expanded="categoryOpen" class="w-full justify-between h-9 font-normal">
                    <span :class="selectedCategoryName ? '' : 'text-muted-foreground'">{{ selectedCategoryName || 'Select category...' }}</span>
                    <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent class="w-[--radix-popover-trigger-width] p-0" align="start">
                  <div class="p-2 border-b">
                    <div class="relative">
                      <SearchIcon class="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input v-model="categorySearch" class="w-full pl-7 pr-3 py-1.5 text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground" placeholder="Search categories..." >
                    </div>
                  </div>
                  <div class="max-h-[200px] overflow-y-auto p-1">
                    <button type="button" class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-left" :class="!formData.description ? 'text-primary font-medium' : ''" @click="formData.description = ''; categoryOpen = false">
                      <span class="w-4 h-4 flex items-center justify-center"><Check v-if="!formData.description" class="w-3.5 h-3.5" /></span>
                      <span class="text-muted-foreground">None</span>
                    </button>
                    <button v-for="c in filteredCategories" :key="c._id" type="button" class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-left" :class="formData.description === c._id ? 'text-primary font-medium' : ''" @click="formData.description = c._id; categoryOpen = false">
                      <span class="w-4 h-4 flex items-center justify-center"><Check v-if="formData.description === c._id" class="w-3.5 h-3.5" /></span>
                      {{ c.name }}
                    </button>
                    <div v-if="filteredCategories.length === 0 && categorySearch" class="px-2 py-3 text-xs text-center text-muted-foreground">No categories match "{{ categorySearch }}"</div>
                  </div>
                  <div class="border-t p-1">
                    <button type="button" class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-primary font-medium" @click="categoryOpen = false; newCategoryName = categorySearch; showAddCategoryDialog = true">
                      <Plus class="w-4 h-4" />Add new category
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <!-- ── Pack Size Combobox ── -->
            <div class="space-y-2">
              <Label>Pack Size</Label>
              <Popover v-model:open="packSizeOpen">
                <PopoverTrigger as-child>
                  <Button variant="outline" role="combobox" :aria-expanded="packSizeOpen" class="w-full justify-between h-9 font-normal">
                    <span :class="formData.packSize ? '' : 'text-muted-foreground'">{{ formData.packSize || 'Select pack size...' }}</span>
                    <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent class="w-[--radix-popover-trigger-width] p-0" align="start">
                  <div class="p-2 border-b">
                    <div class="relative">
                      <SearchIcon class="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input v-model="packSizeSearch" class="w-full pl-7 pr-3 py-1.5 text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground" placeholder="Search pack sizes..." >
                    </div>
                  </div>
                  <div class="max-h-[200px] overflow-y-auto p-1">
                    <button type="button" class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-left" :class="!formData.packSize ? 'text-primary font-medium' : ''" @click="formData.packSize = ''; packSizeOpen = false">
                      <span class="w-4 h-4 flex items-center justify-center"><Check v-if="!formData.packSize" class="w-3.5 h-3.5" /></span>
                      <span class="text-muted-foreground">None</span>
                    </button>
                    <button v-for="ps in filteredPackSizes" :key="ps" type="button" class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-left" :class="formData.packSize === ps ? 'text-primary font-medium' : ''" @click="formData.packSize = ps; packSizeOpen = false">
                      <span class="w-4 h-4 flex items-center justify-center"><Check v-if="formData.packSize === ps" class="w-3.5 h-3.5" /></span>
                      {{ ps }}
                    </button>
                    <div v-if="filteredPackSizes.length === 0 && packSizeSearch" class="px-2 py-3 text-xs text-center text-muted-foreground">No pack sizes match "{{ packSizeSearch }}"</div>
                  </div>
                  <div class="border-t p-1">
                    <button type="button" class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-primary font-medium" @click="packSizeOpen = false; newPackSize = packSizeSearch; showAddPackSizeDialog = true">
                      <Plus class="w-4 h-4" />Add new pack size
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <!-- Row 4: Quantities & Prices -->
          <Separator />
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div class="space-y-2">
              <Label for="fiUnitQty">Unit (QTY)</Label>
              <Input id="fiUnitQty" v-model.number="formData.unitQty" type="number" min="0" />
            </div>
            <div class="space-y-2">
              <Label for="fiCaseQty">Case (QTY)</Label>
              <Input id="fiCaseQty" v-model.number="formData.caseQty" type="number" min="0" />
            </div>
            <div class="space-y-2">
              <Label for="fiUnitPrice">Unit Price ($)</Label>
              <Input id="fiUnitPrice" v-model.number="formData.unitPrice" type="number" min="0" step="0.01" />
            </div>
            <div class="space-y-2">
              <Label for="fiCasePrice">Case Price ($)</Label>
              <Input id="fiCasePrice" v-model.number="formData.casePrice" type="number" min="0" step="0.01" />
            </div>
          </div>

          <!-- Row 5: Par -->
          <Separator />
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div class="space-y-2">
              <Label for="fiPar">Par</Label>
              <Input id="fiPar" v-model.number="formData.par" type="number" min="0" />
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

    <!-- ═══ Quick-Add Dialogs ═══ -->
    <Dialog v-model:open="showAddVendorDialog">
      <DialogContent class="sm:max-w-[380px]">
        <DialogHeader><DialogTitle>Add Vendor</DialogTitle><DialogDescription class="sr-only">Quick-add a new vendor</DialogDescription></DialogHeader>
        <form @submit.prevent="addQuickVendor">
          <div class="space-y-2 mb-4"><Label for="newVendor">Vendor Name</Label><Input id="newVendor" v-model="newVendorName" placeholder="e.g. Restaurant Depot" /></div>
          <DialogFooter><Button variant="outline" type="button" @click="showAddVendorDialog = false">Cancel</Button><Button type="submit">Add Vendor</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showAddLocationDialog">
      <DialogContent class="sm:max-w-[380px]">
        <DialogHeader><DialogTitle>Add Location</DialogTitle><DialogDescription class="sr-only">Quick-add a new location</DialogDescription></DialogHeader>
        <form @submit.prevent="addQuickLocation">
          <div class="space-y-2 mb-4"><Label for="newLocation">Location Name</Label><Input id="newLocation" v-model="newLocationName" placeholder="e.g. Main Kitchen" /></div>
          <DialogFooter><Button variant="outline" type="button" @click="showAddLocationDialog = false">Cancel</Button><Button type="submit">Add Location</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showAddCategoryDialog">
      <DialogContent class="sm:max-w-[380px]">
        <DialogHeader><DialogTitle>Add Category</DialogTitle><DialogDescription class="sr-only">Quick-add a new category</DialogDescription></DialogHeader>
        <form @submit.prevent="addQuickCategory">
          <div class="space-y-2 mb-4"><Label for="newCategory">Category Name</Label><Input id="newCategory" v-model="newCategoryName" placeholder="e.g. Seafood, Dairy..." /></div>
          <DialogFooter><Button variant="outline" type="button" @click="showAddCategoryDialog = false">Cancel</Button><Button type="submit">Add Category</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showAddPackSizeDialog">
      <DialogContent class="sm:max-w-[380px]">
        <DialogHeader><DialogTitle>Add Pack Size</DialogTitle><DialogDescription class="sr-only">Add a custom pack size</DialogDescription></DialogHeader>
        <form @submit.prevent="addCustomPackSize">
          <div class="space-y-2 mb-4"><Label for="newPs">Pack Size Name</Label><Input id="newPs" v-model="newPackSize" placeholder="e.g. Gallon, Tub, Box..." /></div>
          <DialogFooter><Button variant="outline" type="button" @click="showAddPackSizeDialog = false">Cancel</Button><Button type="submit">Add</Button></DialogFooter>
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
