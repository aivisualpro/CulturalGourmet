<script setup lang="ts">
import { toast } from 'vue-sonner'
import { HEADER_ACTIONS_ID } from '~/composables/usePageHeader'
import { getUnitAbbr } from '~/constants/units'

const { setHeader } = usePageHeader()
setHeader({ title: 'Items', icon: 'i-lucide-package' })

// ─── State ──────────────────────────────────────────────────
const items = ref<any[]>([])
const loading = ref(true)
const search = ref('')
const showDialog = ref(false)
const showDeleteDialog = ref(false)
const editingItem = ref<any>(null)
const deletingItem = ref<any>(null)
const saving = ref(false)

const defaultForm = () => ({
  itemSKU: '',
  item: '',
  category: '',
  subCategory: '',
  unit: '',
})

const formData = ref(defaultForm())

// ─── Fetch ──────────────────────────────────────────────────
async function fetchItems() {
  loading.value = true
  try { items.value = await $fetch('/api/items') }
  catch { toast.error('Failed to load items') }
  finally { loading.value = false }
}

onMounted(async () => {
  await fetchItems()
})

// ─── Computed ───────────────────────────────────────────────
const filtered = computed(() => {
  if (!search.value) return items.value
  const q = search.value.toLowerCase()
  return items.value.filter((i: any) =>
    i.item?.toLowerCase().includes(q)
    || i.itemSKU?.toLowerCase().includes(q)
    || i.category?.toLowerCase().includes(q)
    || i.subCategory?.toLowerCase().includes(q),
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
    itemSKU: item.itemSKU || '',
    item: item.item || '',
    category: item.category || '',
    subCategory: item.subCategory || '',
    unit: item.unit || '',
  }
  showDialog.value = true
}

async function handleSave() {
  if (!formData.value.item.trim()) { toast.error('Item name is required'); return }
  saving.value = true

  try {
    if (editingItem.value) {
      await $fetch(`/api/items/${editingItem.value._id}`, { method: 'PUT', body: formData.value })
      toast.success('Item updated')
    }
    else {
      await $fetch('/api/items', { method: 'POST', body: formData.value })
      toast.success('Item created')
    }
    showDialog.value = false
    await fetchItems()
  }
  catch { toast.error('Failed to save item') }
  finally { saving.value = false }
}

function confirmDelete(item: any) { deletingItem.value = item; showDeleteDialog.value = true }

async function handleDelete() {
  if (!deletingItem.value) return
  try {
    await $fetch(`/api/items/${deletingItem.value._id}`, { method: 'DELETE' })
    toast.success('Item deleted')
    showDeleteDialog.value = false
    deletingItem.value = null
    await fetchItems()
  }
  catch { toast.error('Failed to delete item') }
}

async function handleReset() { search.value = ''; await fetchItems(); toast.info('Refreshed') }
</script>

<template>
  <Teleport :to="`#${HEADER_ACTIONS_ID}`">
    <div class="flex items-center gap-2">
      <div class="relative hidden sm:block">
        <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input v-model="search" placeholder="Search items..." class="pl-8 h-8 w-48 lg:w-64 text-xs" />
      </div>
      <p class="text-xs text-muted-foreground tabular-nums whitespace-nowrap hidden md:block">
        {{ filtered.length }} item{{ filtered.length !== 1 ? 's' : '' }}
      </p>
      <Button variant="ghost" size="sm" class="h-8 text-xs" @click="handleReset">
        <Icon name="i-lucide-rotate-ccw" class="mr-1 size-3.5" />Reset
      </Button>
      <UnitConverter />
      <Button size="sm" class="h-8 text-xs" @click="openCreate">
        <Icon name="i-lucide-plus" class="mr-1 size-3.5" />Add Item
      </Button>
    </div>
  </Teleport>

  <div class="w-full flex flex-col gap-6">
    <div class="sm:hidden relative">
      <Icon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input v-model="search" placeholder="Search items..." class="pl-9" />
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
              <TableHead>Item SKU</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Sub Category</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead class="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="fi in filtered" :key="fi._id" class="group cursor-pointer hover:bg-muted/30 transition-colors" @click="navigateTo(`/inventory/items/${fi._id}`)">
              <TableCell><span class="text-sm font-mono">{{ fi.itemSKU || '—' }}</span></TableCell>
              <TableCell><span class="font-medium text-sm">{{ fi.item }}</span></TableCell>
              <TableCell>
                <Badge v-if="fi.category" variant="outline" class="text-xs font-normal">{{ fi.category }}</Badge>
                <span v-else class="text-muted-foreground text-sm">—</span>
              </TableCell>
              <TableCell>
                <Badge v-if="fi.subCategory" variant="secondary" class="text-xs font-normal">{{ fi.subCategory }}</Badge>
                <span v-else class="text-muted-foreground text-sm">—</span>
              </TableCell>
              <TableCell>
                <span v-if="fi.unit" class="text-sm font-medium">{{ getUnitAbbr(fi.unit) || fi.unit }}</span>
                <span v-else class="text-muted-foreground text-sm">—</span>
              </TableCell>
              <TableCell class="text-right">
                <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" class="size-8" title="View transactions" @click.stop="navigateTo(`/inventory/items/${fi._id}`)"><Icon name="i-lucide-eye" class="size-3.5" /></Button>
                  <Button variant="ghost" size="icon" class="size-8" @click.stop="openEdit(fi)"><Icon name="i-lucide-pencil" class="size-3.5" /></Button>
                  <Button variant="ghost" size="icon" class="size-8 text-destructive hover:text-destructive" @click.stop="confirmDelete(fi)"><Icon name="i-lucide-trash-2" class="size-3.5" /></Button>
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-if="filtered.length === 0">
              <TableCell :colspan="6" class="h-32 text-center">
                <div class="flex flex-col items-center gap-2 text-muted-foreground">
                  <Icon name="i-lucide-inbox" class="size-8" /><p>No items found</p>
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
      <DialogContent class="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ editingItem ? 'Edit' : 'New' }} Item</DialogTitle>
          <DialogDescription class="sr-only">{{ editingItem ? 'Edit' : 'Create' }} an item</DialogDescription>
        </DialogHeader>
        <form class="space-y-5" @submit.prevent="handleSave">
          <!-- Row 1: Item SKU + Item -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="itemSku">
                Item SKU
                <span v-if="!editingItem" class="text-xs text-muted-foreground font-normal ml-1">(auto-generated)</span>
              </Label>
              <div class="relative">
                <Input
                  id="itemSku"
                  v-model="formData.itemSKU"
                  :placeholder="editingItem ? formData.itemSKU : 'Auto: ITM-001'"
                  :disabled="!editingItem"
                  :class="!editingItem && 'bg-muted/50 text-muted-foreground'"
                />
                <Icon v-if="!editingItem" name="i-lucide-sparkles" class="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-primary/50" />
              </div>
            </div>
            <div class="space-y-2">
              <Label for="itemName">Item <span class="text-destructive">*</span></Label>
              <Input id="itemName" v-model="formData.item" placeholder="e.g. Chicken Breast" />
            </div>
          </div>

          <!-- Row 2: Category + Sub Category + Unit -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="space-y-2 sm:col-span-2">
              <Label>Category & Sub Category</Label>
              <CategorySelect
                :category="formData.category"
                :sub-category="formData.subCategory"
                @update:category="formData.category = $event"
                @update:sub-category="formData.subCategory = $event"
              />
            </div>
            <div class="space-y-2">
              <Label>Unit of Measure</Label>
              <UnitSelect v-model="formData.unit" placeholder="Select unit" />
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

    <!-- Delete Confirmation -->
    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Item?</AlertDialogTitle>
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
