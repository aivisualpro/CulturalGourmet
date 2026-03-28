<script setup lang="ts">
import { toast } from 'vue-sonner'
import { HEADER_ACTIONS_ID } from '~/composables/usePageHeader'

const { setHeader } = usePageHeader()
setHeader({ title: 'Purchase Orders', icon: 'i-lucide-file-text' })

// ─── Types ────────────────────────────────────────────────────────────────────
interface LineItem {
  _id?: string
  lineNumber: number
  vendorItemCode: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  taxAmount: number
  extendedPrice: number
  pack?: string
  size?: string
  category?: string
  mappedItemId?: string
  mappedSku?: string
  mappedItemName?: string
  skuLinked: boolean
  // UI-only (not saved)
  _skuSearchOpen?: boolean
}

interface POHeader {
  vendorId?: string
  vendorName: string
  invoiceNumber: string
  invoiceDate?: string
  deliveryDate?: string
  paymentDueDate?: string
  poNumber?: string
  orderNumber?: string
  customerNumber?: string
  soldToName?: string
  soldToAddress?: string
  shipToName?: string
  shipToAddress?: string
  notes?: string
}

interface PurchaseOrder {
  _id: string
  status: 'draft' | 'reviewed' | 'approved' | 'received' | 'cancelled'
  vendorName: string
  vendorId?: string
  invoiceNumber: string
  invoiceDate?: string
  deliveryDate?: string
  paymentDueDate?: string
  poNumber?: string
  orderNumber?: string
  customerNumber?: string
  soldToName?: string
  soldToAddress?: string
  shipToName?: string
  shipToAddress?: string
  invoiceTotal: number
  subTotal: number
  taxTotal: number
  otherCharges: number
  totalItems: number
  notes?: string
  lineItems?: LineItem[]
  pdfAttachment?: {
    secureUrl: string
    originalFileName: string
    pageCount: number
    fileSizeBytes: number
  }
  createdAt: string
  updatedAt: string
}

interface VendorSkuMap {
  vendorSku: string
  vendorSkuDescription: string
  ourItemId: string
  ourSku: string
  ourItemName: string
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const { vendors, items: storeItems } = useDataStore()

const orders = ref<PurchaseOrder[]>([])
const totalOrders = ref(0)
const loading = ref(false)
const page = ref(1)
const limit = 20
const statusFilter = ref('all')
const search = ref('')

// ─── Upload / Preview Flow ────────────────────────────────────────────────────
const showUploadDialog = ref(false)
const showPreviewDialog = ref(false)
const uploading = ref(false)
const saving = ref(false)

const dragOver = ref(false)
const fileInputRef = ref<HTMLInputElement>()
const selectedFile = ref<File | null>(null)

// Preview state (editable after extraction)
const previewHeader = ref<POHeader>({
  vendorName: '',
  invoiceNumber: '',
})
const previewLineItems = ref<LineItem[]>([])
const previewFinancials = ref({
  subTotal: 0,
  taxTotal: 0,
  otherCharges: 0,
  invoiceTotal: 0,
})
const pdfAttachment = ref<any>(null)

// SKU mapping cache per vendor
const skuMaps = ref<Record<string, VendorSkuMap>>({}) // key = vendorSku

// SKU search
const allItems = computed(() => storeItems.value)
const skuSearchQuery = ref<Record<string, string>>({})

// ─── Detail Dialog ────────────────────────────────────────────────────────────
const showDetailDialog = ref(false)
const detailOrder = ref<PurchaseOrder | null>(null)
const detailLoading = ref(false)

// ─── Delete dialog ────────────────────────────────────────────────────────────
const showDeleteDialog = ref(false)
const deletingOrder = ref<PurchaseOrder | null>(null)

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500' },
  reviewed: { label: 'Reviewed', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400', dot: 'bg-blue-500' },
  approved: { label: 'Approved', color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500' },
  received: { label: 'Received', color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400', dot: 'bg-purple-500' },
  cancelled: { label: 'Cancelled', color: 'text-muted-foreground bg-muted', dot: 'bg-muted-foreground' },
} as const

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'approved', label: 'Approved' },
  { key: 'received', label: 'Received' },
  { key: 'cancelled', label: 'Cancelled' },
]

// ─── Fetch Logic ──────────────────────────────────────────────────────────────
async function fetchOrders() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, limit }
    if (statusFilter.value !== 'all') params.status = statusFilter.value
    if (search.value.trim()) params.search = search.value.trim()

    const res = await $fetch<{ items: PurchaseOrder[], total: number }>('/api/purchase-orders', { params })
    orders.value = res.items
    totalOrders.value = res.total
  }
  catch {
    toast.error('Failed to load purchase orders')
  }
  finally {
    loading.value = false
  }
}



async function fetchSkuMaps(vendorId?: string) {
  if (!vendorId) return
  try {
    const maps = await $fetch<VendorSkuMap[]>('/api/purchase-orders/sku-maps', {
      params: { vendorId },
    })
    const mapped: Record<string, VendorSkuMap> = {}
    for (const m of maps) mapped[m.vendorSku] = m
    skuMaps.value = mapped
  }
  catch { /* ignore */ }
}

watch([statusFilter, search], () => {
  page.value = 1
  fetchOrders()
})

onMounted(() => {
  fetchOrders()
})

// ─── File Handling ────────────────────────────────────────────────────────────
function onDragOver(e: DragEvent) {
  e.preventDefault()
  dragOver.value = true
}

function onDragLeave() {
  dragOver.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file && file.type === 'application/pdf') {
    selectedFile.value = file
    processUpload()
  }
  else {
    toast.error('Please drop a PDF file')
  }
}

function onFileSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    selectedFile.value = file
    processUpload()
  }
}

async function processUpload() {
  if (!selectedFile.value) return
  uploading.value = true
  showUploadDialog.value = false

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    const res = await $fetch<{ parsed: any, pdfAttachment: any }>('/api/purchase-orders/upload', {
      method: 'POST',
      body: formData,
    })

    const p = res.parsed
    pdfAttachment.value = res.pdfAttachment

    // Populate preview header
    previewHeader.value = {
      vendorName: p.vendorName || '',
      invoiceNumber: p.invoiceNumber || '',
      invoiceDate: p.invoiceDate || '',
      deliveryDate: p.deliveryDate || '',
      paymentDueDate: p.paymentDueDate || '',
      poNumber: p.poNumber || '',
      orderNumber: p.orderNumber || '',
      customerNumber: p.customerNumber || '',
      soldToName: p.soldToName || '',
      soldToAddress: p.soldToAddress || '',
      shipToName: p.shipToName || '',
      shipToAddress: p.shipToAddress || '',
      notes: '',
    }

    // Try to match vendorName to vendor list
    const vendor = vendors.value?.find((v: any) =>
      v.vendorName?.toLowerCase().includes(p.vendorName?.toLowerCase())
      || p.vendorName?.toLowerCase().includes(v.vendorName?.toLowerCase()),
    )
    if (vendor) {
      previewHeader.value.vendorId = vendor._id
      await fetchSkuMaps(vendor._id)
    }

    previewFinancials.value = {
      subTotal: p.subTotal || 0,
      taxTotal: p.taxTotal || 0,
      otherCharges: p.otherCharges || 0,
      invoiceTotal: p.invoiceTotal || 0,
    }

    // Process line items — auto-apply known SKU mappings
    previewLineItems.value = (p.lineItems || []).map((item: any, idx: number) => {
      const mapped = skuMaps.value[item.vendorItemCode]
      return {
        ...item,
        lineNumber: idx + 1,
        skuLinked: !!mapped,
        mappedItemId: mapped?.ourItemId || '',
        mappedSku: mapped?.ourSku || '',
        mappedItemName: mapped?.ourItemName || '',
        _skuSearchOpen: false,
      }
    })

    showPreviewDialog.value = true
  }
  catch (err: any) {
    toast.error(err?.data?.message || 'Failed to process PDF')
  }
  finally {
    uploading.value = false
    selectedFile.value = null
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
}

// ─── SKU Linking ──────────────────────────────────────────────────────────────
function filteredItemsForSku(lineIndex: number): any[] {
  const q = (skuSearchQuery.value[String(lineIndex)] || '').toLowerCase()
  if (!q) return allItems.value.slice(0, 20)
  return allItems.value.filter((it: any) =>
    it.item?.toLowerCase().includes(q)
    || it.itemSKU?.toLowerCase().includes(q),
  ).slice(0, 20)
}

function linkSku(lineIndex: number, item: any) {
  const lineItem = previewLineItems.value[lineIndex]
  if (!lineItem) return
  lineItem.mappedItemId = item._id
  lineItem.mappedSku = item.itemSKU
  lineItem.mappedItemName = item.item
  lineItem.skuLinked = true
  lineItem._skuSearchOpen = false
}

function unlinkSku(lineIndex: number) {
  const lineItem = previewLineItems.value[lineIndex]
  if (!lineItem) return
  lineItem.mappedItemId = ''
  lineItem.mappedSku = ''
  lineItem.mappedItemName = ''
  lineItem.skuLinked = false
}

// Recalculate extended price when qty/price changes
function recalcLine(lineItem: LineItem) {
  lineItem.extendedPrice = Math.round(lineItem.quantity * lineItem.unitPrice * 100) / 100
  recalcTotals()
}

function recalcTotals() {
  const sub = previewLineItems.value.reduce((acc, li) => acc + (li.extendedPrice || 0), 0)
  previewFinancials.value.subTotal = Math.round(sub * 100) / 100
  previewFinancials.value.invoiceTotal = Math.round(
    (previewFinancials.value.subTotal + previewFinancials.value.taxTotal + previewFinancials.value.otherCharges) * 100)
    / 100
}

function addLineItem() {
  previewLineItems.value.push({
    lineNumber: previewLineItems.value.length + 1,
    vendorItemCode: '',
    description: '',
    quantity: 0,
    unit: 'EA',
    unitPrice: 0,
    taxAmount: 0,
    extendedPrice: 0,
    skuLinked: false,
    _skuSearchOpen: false,
  })
}

function removeLineItem(idx: number) {
  previewLineItems.value.splice(idx, 1)
  previewLineItems.value.forEach((li, i) => (li.lineNumber = i + 1))
  recalcTotals()
}

function closeSkuDropdown(lineItem: LineItem) {
  setTimeout(() => { lineItem._skuSearchOpen = false }, 200)
}

// ─── Save PO ──────────────────────────────────────────────────────────────────
async function handleSave() {
  if (!previewHeader.value.vendorName.trim()) {
    toast.error('Vendor name is required')
    return
  }

  // Save SKU mappings for future auto-linking
  const vendorId = previewHeader.value.vendorId
  if (vendorId) {
    const mappingPromises = previewLineItems.value
      .filter(li => li.skuLinked && li.mappedItemId && li.vendorItemCode)
      .map(li =>
        $fetch('/api/purchase-orders/sku-maps', {
          method: 'POST',
          body: {
            vendorId,
            vendorName: previewHeader.value.vendorName,
            vendorSku: li.vendorItemCode,
            vendorSkuDescription: li.description,
            ourItemId: li.mappedItemId,
            ourSku: li.mappedSku,
            ourItemName: li.mappedItemName,
          },
        }).catch(() => null),
      )
    await Promise.all(mappingPromises)
  }

  // Build PO payload
  const cleanItems = previewLineItems.value.map((li) => {
    const { _skuSearchOpen, ...rest } = li
    return rest
  })

  const payload = {
    ...previewHeader.value,
    lineItems: cleanItems,
    ...previewFinancials.value,
    totalItems: cleanItems.length,
    pdfAttachment: pdfAttachment.value || undefined,
    status: 'draft',
  }

  saving.value = true
  try {
    await $fetch('/api/purchase-orders', { method: 'POST', body: payload })
    toast.success('Purchase order saved successfully!')
    showPreviewDialog.value = false
    await fetchOrders()
  }
  catch (err: any) {
    toast.error(err?.data?.message || 'Failed to save purchase order')
  }
  finally {
    saving.value = false
  }
}

// ─── Detail View ──────────────────────────────────────────────────────────────
async function openDetail(order: PurchaseOrder) {
  detailLoading.value = true
  showDetailDialog.value = true
  try {
    const full = await $fetch<PurchaseOrder>(`/api/purchase-orders/${order._id}`)
    detailOrder.value = full
  }
  catch {
    toast.error('Failed to load order details')
    showDetailDialog.value = false
  }
  finally {
    detailLoading.value = false
  }
}

async function updateStatus(order: PurchaseOrder, newStatus: string) {
  try {
    const updated = await $fetch<PurchaseOrder>(`/api/purchase-orders/${order._id}`, {
      method: 'PUT',
      body: { status: newStatus },
    })
    // Update in list
    const idx = orders.value.findIndex(o => o._id === order._id)
    if (idx !== -1) (orders.value[idx] as any).status = updated.status
    if (detailOrder.value?._id === order._id) (detailOrder.value as any).status = updated.status
    toast.success(`Status updated to ${newStatus}`)
  }
  catch {
    toast.error('Failed to update status')
  }
}

function confirmDelete(order: PurchaseOrder) {
  deletingOrder.value = order
  showDeleteDialog.value = true
}

async function handleDelete() {
  if (!deletingOrder.value) return
  try {
    await $fetch(`/api/purchase-orders/${deletingOrder.value._id}`, { method: 'DELETE' })
    toast.success('Purchase order deleted')
    showDeleteDialog.value = false
    if (detailOrder.value?._id === deletingOrder.value._id) showDetailDialog.value = false
    await fetchOrders()
  }
  catch {
    toast.error('Failed to delete purchase order')
  }
}

// ─── Formatters ───────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)
}

function fmtDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function fmtSize(bytes: number) {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function linkedCount(items: LineItem[]) {
  return items.filter(li => li.skuLinked).length
}
</script>

<template>
  <!-- Header Actions -->
  <ClientOnly>
    <Teleport :to="`#${HEADER_ACTIONS_ID}`" defer>
      <div class="flex items-center gap-2">
        <div class="relative hidden sm:block">
          <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            v-model="search"
            placeholder="Search orders..."
            class="pl-8 h-8 w-48 lg:w-60 text-xs"
          />
        </div>
        <p class="text-xs text-muted-foreground tabular-nums whitespace-nowrap hidden md:block">
          {{ totalOrders }} order{{ totalOrders !== 1 ? 's' : '' }}
        </p>
        <Button variant="ghost" size="sm" class="h-8 text-xs" @click="fetchOrders">
          <Icon name="i-lucide-rotate-ccw" class="mr-1 size-3.5" />
          Refresh
        </Button>
        <Button size="sm" class="h-8 text-xs" @click="showUploadDialog = true">
          <Icon name="i-lucide-upload" class="mr-1 size-3.5" />
          Upload Invoice
        </Button>
      </div>
    </Teleport>
  </ClientOnly>

  <div class="w-full flex flex-col gap-4">
    <!-- Mobile Search -->
    <div class="sm:hidden relative">
      <Icon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input v-model="search" placeholder="Search orders..." class="pl-9" />
    </div>

    <!-- Status Filter Pills -->
    <div class="shrink-0 flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-0.5">
      <button
        v-for="tab in STATUS_TABS"
        :key="tab.key"
        class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
        :class="statusFilter === tab.key
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'"
        @click="statusFilter = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Empty state banner -->
    <Card v-if="!loading && orders.length === 0" class="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div class="size-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Icon name="i-lucide-file-search" class="size-8 text-primary" />
      </div>
      <div>
        <p class="font-semibold text-base">No Purchase Orders</p>
        <p class="text-sm text-muted-foreground mt-1">Upload a vendor invoice PDF to get started</p>
      </div>
      <Button size="sm" @click="showUploadDialog = true">
        <Icon name="i-lucide-upload" class="mr-1.5 size-4" />
        Upload Invoice
      </Button>
    </Card>

    <!-- Orders Table -->
    <Card v-else>
      <!-- Loading skeleton -->
      <div v-if="loading" class="p-4 space-y-3">
        <Skeleton v-for="i in 5" :key="i" class="h-12 w-full" />
      </div>
      <div v-else class="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-10">#</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Invoice #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>PDF</TableHead>
              <TableHead class="text-right w-[90px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="(order, i) in orders"
              :key="order._id"
              class="group cursor-pointer hover:bg-muted/40 transition-colors"
              @click="openDetail(order)"
            >
              <TableCell class="text-muted-foreground text-xs tabular-nums">
                {{ (page - 1) * limit + i + 1 }}
              </TableCell>
              <TableCell>
                <div class="flex items-center gap-2.5">
                  <div class="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span class="text-xs font-bold text-primary">{{ order.vendorName?.charAt(0)?.toUpperCase() || '?' }}</span>
                  </div>
                  <span class="font-medium text-sm truncate max-w-[140px]">{{ order.vendorName }}</span>
                </div>
              </TableCell>
              <TableCell>
                <span class="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{{ order.invoiceNumber || '—' }}</span>
              </TableCell>
              <TableCell class="text-sm text-muted-foreground whitespace-nowrap">
                {{ fmtDate(order.invoiceDate) }}
              </TableCell>
              <TableCell>
                <span class="text-sm tabular-nums font-medium">{{ order.totalItems }}</span>
              </TableCell>
              <TableCell>
                <span class="text-sm font-semibold tabular-nums">{{ fmt(order.invoiceTotal) }}</span>
              </TableCell>
              <TableCell>
                <span
                  class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="STATUS_CONFIG[order.status]?.color"
                >
                  <span class="size-1.5 rounded-full" :class="STATUS_CONFIG[order.status]?.dot" />
                  {{ STATUS_CONFIG[order.status]?.label }}
                </span>
              </TableCell>
              <TableCell>
                <a
                  v-if="order.pdfAttachment?.secureUrl"
                  :href="order.pdfAttachment.secureUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  @click.stop
                >
                  <Icon name="i-lucide-paperclip" class="size-3" />
                  PDF
                </a>
                <span v-else class="text-muted-foreground text-xs">—</span>
              </TableCell>
              <TableCell class="text-right">
                <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
                  <Button variant="ghost" size="icon" class="size-7" @click="openDetail(order)">
                    <Icon name="i-lucide-eye" class="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" class="size-7 text-destructive hover:text-destructive" @click="confirmDelete(order)">
                    <Icon name="i-lucide-trash-2" class="size-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- Pagination -->
      <div v-if="totalOrders > limit" class="flex items-center justify-between px-4 py-3 border-t">
        <p class="text-xs text-muted-foreground">
          {{ (page - 1) * limit + 1 }}–{{ Math.min(page * limit, totalOrders) }} of {{ totalOrders }}
        </p>
        <div class="flex gap-1">
          <Button variant="outline" size="sm" class="h-7 text-xs" :disabled="page <= 1" @click="page--; fetchOrders()">
            <Icon name="i-lucide-chevron-left" class="size-3.5" />
          </Button>
          <Button variant="outline" size="sm" class="h-7 text-xs" :disabled="page * limit >= totalOrders" @click="page++; fetchOrders()">
            <Icon name="i-lucide-chevron-right" class="size-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- UPLOAD DIALOG                                                          -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <Dialog v-model:open="showUploadDialog">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Icon name="i-lucide-file-up" class="size-5 text-primary" />
          Upload Vendor Invoice
        </DialogTitle>
        <DialogDescription>
          Upload a PDF invoice from any vendor. We'll extract all the data automatically.
        </DialogDescription>
      </DialogHeader>

      <!-- Drop Zone -->
      <div
        class="mt-2 border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-4 transition-all cursor-pointer select-none"
        :class="dragOver ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/50 hover:bg-muted/30'"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
        @click="fileInputRef?.click()"
      >
        <div class="size-14 rounded-2xl flex items-center justify-center transition-colors" :class="dragOver ? 'bg-primary/20' : 'bg-muted'">
          <Icon name="i-lucide-file-text" class="size-7" :class="dragOver ? 'text-primary' : 'text-muted-foreground'" />
        </div>
        <div class="text-center">
          <p class="font-semibold text-sm">
            {{ dragOver ? 'Drop it here!' : 'Drop your PDF here' }}
          </p>
          <p class="text-xs text-muted-foreground mt-1">
            or click to browse · Max 50 MB · Multi-page supported
          </p>
        </div>
        <div class="flex flex-wrap gap-1.5 justify-center">
          <span v-for="v in ['Sysco', 'JJ McDonnell', 'US Foods', 'Restaurant Depot']" :key="v" class="px-2 py-0.5 rounded-md bg-muted text-xs text-muted-foreground">{{ v }}</span>
        </div>
        <input
          ref="fileInputRef"
          type="file"
          accept="application/pdf"
          class="hidden"
          @change="onFileSelect"
        >
      </div>

      <!-- Processing indicator -->
      <div v-if="uploading" class="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
        <Icon name="i-lucide-loader-2" class="size-4 animate-spin text-primary shrink-0" />
        <div class="text-sm">
          <p class="font-medium">Processing PDF...</p>
          <p class="text-xs text-muted-foreground">Extracting data and uploading to cloud</p>
        </div>
      </div>
    </DialogContent>
  </Dialog>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- PREVIEW / EDIT DIALOG                                                  -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <Dialog v-model:open="showPreviewDialog">
    <DialogContent class="max-w-6xl w-full max-h-[95vh] flex flex-col p-0 gap-0">
      <!-- Header Bar -->
      <div class="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
        <div class="flex items-center gap-3">
          <div class="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="i-lucide-file-check-2" class="size-5 text-primary" />
          </div>
          <div>
            <p class="font-semibold text-sm">Review & Edit Extracted Data</p>
            <p class="text-xs text-muted-foreground">
              Verify all information is correct before saving
              <span v-if="pdfAttachment" class="ml-2 text-emerald-600 dark:text-emerald-400">
                <Icon name="i-lucide-cloud-check" class="inline size-3 mr-0.5" />Cloud uploaded
              </span>
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" class="h-8 text-xs" @click="showPreviewDialog = false">
            Cancel
          </Button>
          <Button size="sm" class="h-8 text-xs" :disabled="saving" @click="handleSave">
            <Icon v-if="saving" name="i-lucide-loader-2" class="mr-1.5 size-3.5 animate-spin" />
            <Icon v-else name="i-lucide-check" class="mr-1.5 size-3.5" />
            {{ saving ? 'Saving...' : 'Confirm & Save' }}
          </Button>
        </div>
      </div>

      <!-- Scrollable Body -->
      <div class="flex-1 overflow-y-auto">
        <div class="p-6 space-y-6">
          <!-- SKU Link Progress Banner -->
          <div
            class="flex items-center gap-3 p-3 rounded-lg border"
            :class="linkedCount(previewLineItems) === previewLineItems.length && previewLineItems.length > 0
              ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800'
              : 'border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800'"
          >
            <Icon
              :name="linkedCount(previewLineItems) === previewLineItems.length && previewLineItems.length > 0
                ? 'i-lucide-package-check'
                : 'i-lucide-package-search'"
              class="size-4 shrink-0"
              :class="linkedCount(previewLineItems) === previewLineItems.length && previewLineItems.length > 0
                ? 'text-emerald-600'
                : 'text-amber-600'"
            />
            <p class="text-xs font-medium">
              <span :class="linkedCount(previewLineItems) === previewLineItems.length && previewLineItems.length > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'">
                {{ linkedCount(previewLineItems) }}/{{ previewLineItems.length }} line items linked to your SKUs.
              </span>
              <span class="text-muted-foreground ml-1">Link vendor SKUs to track inventory accurately. Mappings are remembered for future invoices.</span>
            </p>
          </div>

          <!-- Invoice Header (2-col grid) -->
          <div>
            <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Invoice Header</h3>
            <div class="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div class="space-y-1.5">
                <Label class="text-xs">Vendor Name *</Label>
                <Input v-model="previewHeader.vendorName" placeholder="Vendor name" class="h-8 text-sm" />
              </div>
              <div class="space-y-1.5">
                <Label class="text-xs">Invoice #</Label>
                <Input v-model="previewHeader.invoiceNumber" placeholder="e.g. 179201" class="h-8 text-sm font-mono" />
              </div>
              <div class="space-y-1.5">
                <Label class="text-xs">Invoice Date</Label>
                <Input v-model="previewHeader.invoiceDate" type="date" class="h-8 text-sm" />
              </div>
              <div class="space-y-1.5">
                <Label class="text-xs">Delivery Date</Label>
                <Input v-model="previewHeader.deliveryDate" type="date" class="h-8 text-sm" />
              </div>
              <div class="space-y-1.5">
                <Label class="text-xs">Payment Due</Label>
                <Input v-model="previewHeader.paymentDueDate" type="date" class="h-8 text-sm" />
              </div>
              <div class="space-y-1.5">
                <Label class="text-xs">Order #</Label>
                <Input v-model="previewHeader.orderNumber" placeholder="Order number" class="h-8 text-sm" />
              </div>
              <div class="space-y-1.5">
                <Label class="text-xs">PO #</Label>
                <Input v-model="previewHeader.poNumber" placeholder="PO number" class="h-8 text-sm" />
              </div>
              <div class="space-y-1.5">
                <Label class="text-xs">Customer #</Label>
                <Input v-model="previewHeader.customerNumber" placeholder="Customer account" class="h-8 text-sm" />
              </div>
              <div class="space-y-1.5 col-span-2 lg:col-span-1">
                <Label class="text-xs">Notes</Label>
                <Input v-model="previewHeader.notes" placeholder="Internal notes..." class="h-8 text-sm" />
              </div>
            </div>
          </div>

          <Separator />

          <!-- Line Items Table -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Line Items ({{ previewLineItems.length }})
              </h3>
              <Button variant="outline" size="sm" class="h-7 text-xs gap-1.5" @click="addLineItem">
                <Icon name="i-lucide-plus" class="size-3.5" />
                Add Line
              </Button>
            </div>

            <div class="border rounded-lg overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full text-xs">
                  <thead class="bg-muted/50">
                    <tr>
                      <th class="px-3 py-2 text-left font-medium text-muted-foreground w-8">#</th>
                      <th class="px-3 py-2 text-left font-medium text-muted-foreground">Vendor Code</th>
                      <th class="px-3 py-2 text-left font-medium text-muted-foreground min-w-[200px]">Description</th>
                      <th class="px-3 py-2 text-left font-medium text-muted-foreground w-16">Cat.</th>
                      <th class="px-3 py-2 text-right font-medium text-muted-foreground w-20">Qty</th>
                      <th class="px-3 py-2 text-left font-medium text-muted-foreground w-14">Unit</th>
                      <th class="px-3 py-2 text-right font-medium text-muted-foreground w-22">Unit $</th>
                      <th class="px-3 py-2 text-right font-medium text-muted-foreground w-22">Ext $</th>
                      <th class="px-3 py-2 text-left font-medium text-muted-foreground min-w-[160px]">Our SKU</th>
                      <th class="px-2 py-2 w-8" />
                    </tr>
                  </thead>
                  <tbody class="divide-y">
                    <!-- Category header rows -->
                    <template v-for="(lineItem, idx) in previewLineItems" :key="idx">
                      <tr
                        v-if="idx === 0 || lineItem.category !== previewLineItems[idx - 1]?.category"
                        class="bg-muted/30"
                      >
                        <td colspan="10" class="px-3 py-1.5">
                          <span class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {{ lineItem.category || 'Items' }}
                          </span>
                        </td>
                      </tr>
                      <tr class="hover:bg-muted/20 transition-colors group/row" :class="lineItem.skuLinked ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : ''">
                        <td class="px-3 py-1.5 text-muted-foreground text-center">{{ lineItem.lineNumber }}</td>
                        <td class="px-3 py-1.5">
                          <Input
                            v-model="lineItem.vendorItemCode"
                            class="h-6 text-xs font-mono w-20"
                            placeholder="CODE"
                          />
                        </td>
                        <td class="px-3 py-1.5">
                          <Input
                            v-model="lineItem.description"
                            class="h-6 text-xs min-w-[200px]"
                            placeholder="Description"
                          />
                        </td>
                        <td class="px-3 py-1.5">
                          <Input
                            v-model="lineItem.category"
                            class="h-6 text-xs w-16"
                            placeholder="—"
                          />
                        </td>
                        <td class="px-3 py-1.5">
                          <Input
                            v-model.number="lineItem.quantity"
                            type="number"
                            step="0.01"
                            class="h-6 text-xs text-right w-20"
                            @input="recalcLine(lineItem)"
                          />
                        </td>
                        <td class="px-3 py-1.5">
                          <Input v-model="lineItem.unit" class="h-6 text-xs w-14" placeholder="EA" />
                        </td>
                        <td class="px-3 py-1.5">
                          <Input
                            v-model.number="lineItem.unitPrice"
                            type="number"
                            step="0.01"
                            class="h-6 text-xs text-right w-22"
                            @input="recalcLine(lineItem)"
                          />
                        </td>
                        <td class="px-3 py-1.5 text-right font-mono font-semibold tabular-nums whitespace-nowrap">
                          {{ fmt(lineItem.extendedPrice) }}
                        </td>
                        <td class="px-3 py-1.5">
                          <!-- SKU Linker -->
                          <div v-if="lineItem.skuLinked" class="flex items-center gap-1.5">
                            <div class="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 rounded text-emerald-700 dark:text-emerald-400 text-[10px] font-medium max-w-[130px]">
                              <Icon name="i-lucide-link" class="size-2.5 shrink-0" />
                              <span class="truncate">{{ lineItem.mappedSku || lineItem.mappedItemName }}</span>
                            </div>
                            <Button variant="ghost" size="icon" class="size-5 text-muted-foreground hover:text-destructive" @click="unlinkSku(idx)">
                              <Icon name="i-lucide-x" class="size-2.5" />
                            </Button>
                          </div>
                          <div v-else class="relative">
                            <Input
                              v-model="skuSearchQuery[String(idx)]"
                              class="h-6 text-xs w-full"
                              placeholder="Search SKU..."
                              @focus="lineItem._skuSearchOpen = true"
                              @blur="closeSkuDropdown(lineItem)"
                            />
                            <div
                              v-if="lineItem._skuSearchOpen && filteredItemsForSku(idx).length > 0"
                              class="absolute z-50 top-full left-0 mt-1 w-64 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto"
                            >
                              <div
                                v-for="item in filteredItemsForSku(idx)"
                                :key="item._id"
                                class="px-3 py-2 hover:bg-muted cursor-pointer"
                                @mousedown.prevent="linkSku(idx, item)"
                              >
                                <p class="font-medium text-xs">{{ item.item }}</p>
                                <p class="text-[10px] text-muted-foreground font-mono">{{ item.itemSKU || 'No SKU' }}</p>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td class="px-2 py-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            class="size-5 text-destructive opacity-0 group-hover/row:opacity-100 transition-opacity"
                            @click="removeLineItem(idx)"
                          >
                            <Icon name="i-lucide-trash-2" class="size-3" />
                          </Button>
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
                  <div class="flex items-center gap-2">
                    <Input
                      v-model.number="previewFinancials.subTotal"
                      type="number"
                      step="0.01"
                      class="h-7 text-xs text-right w-28"
                    />
                  </div>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-muted-foreground">Tax</span>
                  <Input
                    v-model.number="previewFinancials.taxTotal"
                    type="number"
                    step="0.01"
                    class="h-7 text-xs text-right w-28"
                  />
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-muted-foreground">Other Charges</span>
                  <Input
                    v-model.number="previewFinancials.otherCharges"
                    type="number"
                    step="0.01"
                    class="h-7 text-xs text-right w-28"
                  />
                </div>
                <Separator />
                <div class="flex justify-between items-center">
                  <span class="font-semibold text-sm">Invoice Total</span>
                  <div class="flex items-center gap-2">
                    <Input
                      v-model.number="previewFinancials.invoiceTotal"
                      type="number"
                      step="0.01"
                      class="h-8 text-sm font-bold text-right w-28"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- PDF Attachment Info -->
          <div v-if="pdfAttachment" class="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border">
            <div class="size-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
              <Icon name="i-lucide-file-text" class="size-4 text-red-600 dark:text-red-400" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-medium truncate">{{ pdfAttachment.originalFileName }}</p>
              <p class="text-[10px] text-muted-foreground">
                {{ fmtSize(pdfAttachment.fileSizeBytes) }} · {{ pdfAttachment.pageCount }} page{{ pdfAttachment.pageCount !== 1 ? 's' : '' }} · Stored in Cloudinary
              </p>
            </div>
            <a :href="pdfAttachment.secureUrl" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" class="h-7 text-xs gap-1.5">
                <Icon name="i-lucide-download" class="size-3.5" />
                Download
              </Button>
            </a>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- DETAIL DIALOG                                                          -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <Dialog v-model:open="showDetailDialog">
    <DialogContent class="max-w-5xl w-full max-h-[92vh] flex flex-col p-0 gap-0">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b">
        <div class="flex items-center gap-3">
          <div v-if="detailOrder" class="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <span class="font-bold text-primary text-sm">{{ detailOrder.vendorName?.charAt(0) }}</span>
          </div>
          <div>
            <p class="font-semibold text-sm">{{ detailOrder?.vendorName }}</p>
            <p class="text-xs text-muted-foreground font-mono">Invoice {{ detailOrder?.invoiceNumber || '—' }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <!-- Status changer -->
          <Select v-if="detailOrder" :model-value="detailOrder.status" @update:model-value="updateStatus(detailOrder, $event as string)">
            <SelectTrigger class="h-8 text-xs w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="s in ['draft','reviewed','approved','received','cancelled']" :key="s" :value="s">
                {{ STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.label }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            v-if="detailOrder?.pdfAttachment?.secureUrl"
            variant="outline"
            size="sm"
            class="h-8 text-xs gap-1.5"
            as="a"
            :href="detailOrder.pdfAttachment.secureUrl"
            target="_blank"
          >
            <Icon name="i-lucide-download" class="size-3.5" />
            PDF
          </Button>
          <Button variant="ghost" size="icon" class="size-8 text-destructive hover:text-destructive" @click="confirmDelete(detailOrder!)">
            <Icon name="i-lucide-trash-2" class="size-4" />
          </Button>
        </div>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6">
        <!-- Loading -->
        <div v-if="detailLoading" class="space-y-3">
          <Skeleton v-for="i in 4" :key="i" class="h-10 w-full" />
        </div>

        <template v-else-if="detailOrder">
          <!-- Header fields grid -->
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div v-for="(f, i) in [
              { label: 'Invoice Date', value: fmtDate(detailOrder.invoiceDate) },
              { label: 'Delivery Date', value: fmtDate(detailOrder.deliveryDate) },
              { label: 'Payment Due', value: fmtDate(detailOrder.paymentDueDate) },
              { label: 'Order #', value: detailOrder.orderNumber || '—' },
              { label: 'Customer #', value: detailOrder.customerNumber || '—' },
              { label: 'PO #', value: detailOrder.poNumber || '—' },
            ]" :key="i" class="space-y-1">
              <p class="text-[10px] text-muted-foreground uppercase tracking-wide">{{ f.label }}</p>
              <p class="text-sm font-medium">{{ f.value }}</p>
            </div>
          </div>

          <Separator />

          <!-- Line Items -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Line Items ({{ detailOrder.lineItems?.length || 0 }})
              </h3>
              <span class="text-xs text-muted-foreground">
                {{ linkedCount(detailOrder.lineItems || []) }}/{{ detailOrder.lineItems?.length || 0 }} SKUs linked
              </span>
            </div>
            <div class="border rounded-lg overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full text-xs">
                  <thead class="bg-muted/50">
                    <tr>
                      <th class="px-3 py-2 text-left font-medium text-muted-foreground">Code</th>
                      <th class="px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
                      <th class="px-3 py-2 text-right font-medium text-muted-foreground">Qty</th>
                      <th class="px-3 py-2 text-left font-medium text-muted-foreground">Unit</th>
                      <th class="px-3 py-2 text-right font-medium text-muted-foreground">Unit $</th>
                      <th class="px-3 py-2 text-right font-medium text-muted-foreground">Tax</th>
                      <th class="px-3 py-2 text-right font-medium text-muted-foreground">Extended</th>
                      <th class="px-3 py-2 text-left font-medium text-muted-foreground">Our SKU</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y">
                    <tr
                      v-for="li in detailOrder.lineItems"
                      :key="li.vendorItemCode + li.lineNumber"
                      class="hover:bg-muted/20"
                      :class="li.skuLinked ? 'bg-emerald-50/20 dark:bg-emerald-900/10' : ''"
                    >
                      <td class="px-3 py-2 font-mono font-medium">{{ li.vendorItemCode || '—' }}</td>
                      <td class="px-3 py-2 max-w-[240px]">
                        <p class="truncate">{{ li.description }}</p>
                        <p v-if="li.category" class="text-[10px] text-muted-foreground font-medium uppercase">{{ li.category }}</p>
                      </td>
                      <td class="px-3 py-2 text-right tabular-nums">{{ li.quantity }}</td>
                      <td class="px-3 py-2">{{ li.unit }}</td>
                      <td class="px-3 py-2 text-right tabular-nums">{{ fmt(li.unitPrice) }}</td>
                      <td class="px-3 py-2 text-right tabular-nums text-muted-foreground">{{ li.taxAmount ? fmt(li.taxAmount) : '—' }}</td>
                      <td class="px-3 py-2 text-right tabular-nums font-semibold">{{ fmt(li.extendedPrice) }}</td>
                      <td class="px-3 py-2">
                        <span
                          v-if="li.skuLinked"
                          class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                        >
                          <Icon name="i-lucide-link" class="size-2.5" />
                          {{ li.mappedSku || li.mappedItemName }}
                        </span>
                        <span v-else class="text-[10px] text-muted-foreground italic">Not linked</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Totals -->
          <div class="flex justify-end">
            <div class="w-72 space-y-2 bg-muted/30 rounded-xl p-4">
              <div class="flex justify-between text-sm">
                <span class="text-muted-foreground">Subtotal</span>
                <span class="font-medium tabular-nums">{{ fmt(detailOrder.subTotal) }}</span>
              </div>
              <div v-if="detailOrder.taxTotal" class="flex justify-between text-sm">
                <span class="text-muted-foreground">Tax</span>
                <span class="tabular-nums">{{ fmt(detailOrder.taxTotal) }}</span>
              </div>
              <div v-if="detailOrder.otherCharges" class="flex justify-between text-sm">
                <span class="text-muted-foreground">Other</span>
                <span class="tabular-nums">{{ fmt(detailOrder.otherCharges) }}</span>
              </div>
              <Separator />
              <div class="flex justify-between items-center">
                <span class="font-bold text-sm">Total</span>
                <span class="font-bold text-lg tabular-nums">{{ fmt(detailOrder.invoiceTotal) }}</span>
              </div>
            </div>
          </div>

          <!-- PDF Attachment -->
          <div v-if="detailOrder.pdfAttachment" class="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border">
            <div class="size-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
              <Icon name="i-lucide-file-text" class="size-4 text-red-600 dark:text-red-400" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-medium truncate">{{ detailOrder.pdfAttachment.originalFileName }}</p>
              <p class="text-[10px] text-muted-foreground">
                {{ fmtSize(detailOrder.pdfAttachment.fileSizeBytes) }} · {{ detailOrder.pdfAttachment.pageCount }} page{{ (detailOrder.pdfAttachment.pageCount || 1) !== 1 ? 's' : '' }}
              </p>
            </div>
            <a :href="detailOrder.pdfAttachment.secureUrl" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" class="h-7 text-xs gap-1.5 shrink-0">
                <Icon name="i-lucide-download" class="size-3.5" />
                Download PDF
              </Button>
            </a>
          </div>
        </template>
      </div>
    </DialogContent>
  </Dialog>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- DELETE CONFIRM                                                         -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <AlertDialog v-model:open="showDeleteDialog">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete Purchase Order?</AlertDialogTitle>
        <AlertDialogDescription>
          This will permanently delete the purchase order for
          <strong>{{ deletingOrder?.vendorName }}</strong> (Invoice #{{ deletingOrder?.invoiceNumber || '—' }}).
          This action cannot be undone.
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
</template>
