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
  locationId?: string
  locationName?: string
  // Vendor contact details from PDF (used when creating new vendor)
  vendorPhone?: string
  vendorEmail?: string
  vendorAddress?: string
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
  linkedItemCount?: number
  notes?: string
  locationId?: string
  locationName?: string
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
const { vendors, items: storeItems, locations, fetchVendors, fetchItems, fetchLocations } = useDataStore()

const orders = ref<PurchaseOrder[]>([])
const totalOrders = ref(0)
const loading = ref(false)
const page = ref(1)
const limit = 20
const statusFilter = ref('all')
const search = ref('')
const selectedFilterVendorId = ref<string | null>(null)
const dateFrom = ref('')
const dateTo = ref('')

const vendorSummaries = ref<{ vendorId: string, vendorName: string, totalOrders: number, totalSum: number }[]>([])

// ─── Upload / Preview Flow ────────────────────────────────────────────────────
const showUploadDialog = ref(false)
const showPreviewDialog = ref(false)
const showDeleteDialog = ref(false)

// Aggressively strip active element focus when any dialog opens to prevent Vaul/Radix aria-hidden collision warnings
watch([showUploadDialog, showPreviewDialog, showDeleteDialog], (isOpenStates) => {
  if (import.meta.client && isOpenStates.some(Boolean)) {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }
})
const uploading = ref(false)
const saving = ref(false)

const dragOver = ref(false)
const fileInputRef = ref<HTMLInputElement>()
const selectedFile = ref<File | null>(null)
const editingOrderId = ref<string | null>(null) // null = new, string = editing existing

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

const categoryTotals = computed(() => {
  const totals: Record<string, number> = {}
  for (const li of previewLineItems.value) {
    const cat = (li.category || 'Uncategorized').trim().toUpperCase()
    totals[cat] = (totals[cat] || 0) + (li.extendedPrice || 0)
  }
  return totals
})

// SKU mapping cache per vendor
const skuMaps = ref<Record<string, VendorSkuMap>>({}) // key = vendorSku

// SKU search
const allItems = computed(() => storeItems.value)
const skuSearchQuery = ref<Record<string, string>>({})

// Calculate position for teleported SKU dropdown
function skuDropdownStyle(idx: number): Record<string, string> {
  const el = document.querySelector(`[data-sku-input="${idx}"]`) as HTMLElement
  if (!el) return { top: '0px', left: '0px' }
  const rect = el.getBoundingClientRect()
  return {
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
  }
}

// Vendor Search
const vendorSearchOpen = ref(false)

const filteredVendors = computed(() => {
  const q = (previewHeader.value.vendorName || '').toLowerCase().trim()
  if (!q) return vendors.value.slice(0, 50)
  return vendors.value.filter((v: any) => v.vendorName?.toLowerCase().includes(q))
})

const exactVendorMatch = computed(() => {
  const q = (previewHeader.value.vendorName || '').toLowerCase().trim()
  if (!q) return true
  return vendors.value.some((v: any) => v.vendorName?.toLowerCase() === q)
})

async function selectVendor(v: any) {
  previewHeader.value.vendorName = v.vendorName
  previewHeader.value.vendorId = v._id
  vendorSearchOpen.value = false
  await fetchSkuMaps(v._id)
}

async function addNewVendor() {
  const name = (previewHeader.value.vendorName || '').trim()
  if (!name) return
  saving.value = true
  try {
    const vendorBody: Record<string, any> = { vendorName: name }
    // Include contact details from parsed PDF if available
    if (previewHeader.value.vendorPhone) vendorBody.phone = previewHeader.value.vendorPhone
    if (previewHeader.value.vendorEmail) vendorBody.email = previewHeader.value.vendorEmail
    if (previewHeader.value.vendorAddress) vendorBody.address = previewHeader.value.vendorAddress
    const res = await $fetch<any>('/api/vendors', {
      method: 'POST',
      body: vendorBody
    })
    await fetchVendors()
    previewHeader.value.vendorId = res._id
    vendorSearchOpen.value = false
    toast.success(`Added new vendor: ${name}`)
  } catch (e: any) {
    toast.error('Failed to create vendor')
  } finally {
    saving.value = false
  }
}

function closeVendorDropdown() {
  setTimeout(() => { vendorSearchOpen.value = false }, 200)
}

function onLocationChange() {
  const loc = locations.value.find((l: any) => l._id === previewHeader.value.locationId)
  previewHeader.value.locationName = loc?.name || ''
}

// ─── Detail Dialog ────────────────────────────────────────────────────────────
const showDetailDialog = ref(false)
const detailOrder = ref<PurchaseOrder | null>(null)
const detailLoading = ref(false)

// ─── Delete dialog ────────────────────────────────────────────────────────────

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
    if (selectedFilterVendorId.value) params.vendorId = selectedFilterVendorId.value
    if (dateFrom.value) params.dateFrom = dateFrom.value
    if (dateTo.value) params.dateTo = dateTo.value

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

async function fetchVendorSummaries() {
  try {
    vendorSummaries.value = await $fetch<any>('/api/purchase-orders/vendors-summary')
  } catch (e) {
    console.error(e)
  }
}

watch([statusFilter, search, selectedFilterVendorId, dateFrom, dateTo], () => {
  page.value = 1
  fetchOrders()
})

const highlightedItemId = ref<string | null>(null)

onMounted(() => {
  fetchVendorSummaries()
  fetchOrders()
  fetchLocations()

  const route = useRoute()
  if (route.query.openPoId) {
    if (route.query.highlightItemId) {
      highlightedItemId.value = route.query.highlightItemId as string
    }
    openDetail({ _id: route.query.openPoId as string } as any).then(() => {
      if (highlightedItemId.value) {
        setTimeout(() => {
          const el = document.getElementById('row-' + highlightedItemId.value)
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 500)
        // Auto-remove highlight blinking after 5 seconds to reduce animation noise
        setTimeout(() => {
          highlightedItemId.value = null
        }, 5000)
      }
    })
  }
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
  editingOrderId.value = null

  try {
    const file = selectedFile.value
    // Get GCS signed upload URL
    const sigRes = await $fetch<any>(`/api/upload/gcs-sign?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type || 'application/pdf')}`)
    
    // Upload directly to Google Cloud Storage (Limitless size)
    const uploadResponse = await fetch(sigRes.url, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type || 'application/pdf'
      }
    })

    if (!uploadResponse.ok) {
      throw new Error(`Failed to safely ingest into secure Cloud Bucket: ${uploadResponse.statusText}`)
    }

    toast.info('Extracting structured text via Gemini AI... Almost done.')

    // Tell the backend to process the file sitting in GCS seamlessly
    const res = await $fetch<{ parsed: any, pdfAttachment: any }>('/api/purchase-orders/upload', {
      method: 'POST',
      body: {
        bucket: sigRes.bucket,
        filename: sigRes.filename,
        originalFileName: file.name,
        bytes: file.size
      },
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
      vendorPhone: p.vendorPhone || '',
      vendorEmail: p.vendorEmail || '',
      vendorAddress: p.vendorAddress || '',
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
    showUploadDialog.value = false
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

function skuSearchHasExactMatch(lineIndex: number): boolean {
  const q = (skuSearchQuery.value[String(lineIndex)] || '').toLowerCase().trim()
  if (!q) return true
  return allItems.value.some((it: any) =>
    it.item?.toLowerCase() === q || it.itemSKU?.toLowerCase() === q
  )
}

const showNewItemDialog = ref(false)
const savingNewItem = ref(false)
const newItemForm = ref({
  item: '',
  category: '',
  subCategory: '',
  unit: '',
})
const pendingLineIndex = ref<number | null>(null)

function openNewItemDialog(lineIndex: number) {
  const q = (skuSearchQuery.value[String(lineIndex)] || '').trim()
  newItemForm.value = {
    item: q,
    category: '',
    subCategory: '',
    unit: '',
  }
  pendingLineIndex.value = lineIndex
  showNewItemDialog.value = true
  
  const lineItem = previewLineItems.value[lineIndex]
  if (lineItem) lineItem._skuSearchOpen = false
}

async function saveNewItemFromDialog() {
  if (!newItemForm.value.item.trim()) {
    toast.error('Item name is required')
    return
  }
  if (pendingLineIndex.value === null) return

  savingNewItem.value = true
  try {
    const newItem = await $fetch<any>('/api/items', {
      method: 'POST',
      body: newItemForm.value
    })
    await fetchItems()
    
    const lineItem = previewLineItems.value[pendingLineIndex.value]
    if (lineItem) {
      lineItem.mappedItemId = newItem._id
      lineItem.mappedSku = newItem.itemSKU
      lineItem.mappedItemName = newItem.item
      lineItem.skuLinked = true
      lineItem._skuSearchOpen = false
    }
    
    toast.success(`Created & linked new item: ${newItem.item}`)
    showNewItemDialog.value = false
    autoSavePO()
  } catch (e: any) {
    toast.error('Failed to create new item')
  } finally {
    savingNewItem.value = false
    pendingLineIndex.value = null
  }
}

const isAutoSaving = ref(false)

async function autoSavePO() {
  if (isAutoSaving.value) return
  
  const name = (previewHeader.value.vendorName || '').trim()
  if (!name) return // Silently abort if required vendor name is missing

  const cleanItems = previewLineItems.value.map((li) => {
    const { _skuSearchOpen, ...rest } = li
    return rest
  })

  // Ensure locationName matches locationId before saving
  if (previewHeader.value.locationId) {
    const loc = locations.value.find((l: any) => l._id === previewHeader.value.locationId)
    previewHeader.value.locationName = loc?.name || ''
  } else {
    previewHeader.value.locationName = ''
  }

  const payload: Record<string, any> = {
    ...previewHeader.value,
    lineItems: cleanItems,
    ...previewFinancials.value,
    totalItems: cleanItems.length,
    pdfAttachment: pdfAttachment.value || undefined,
  }

  if (!editingOrderId.value) {
    payload.status = 'draft'
  }

  isAutoSaving.value = true
  try {
    if (editingOrderId.value) {
      await $fetch<any>(`/api/purchase-orders/${editingOrderId.value}`, { method: 'PUT', body: payload })
    } else {
      const resp = await $fetch<any>('/api/purchase-orders', { method: 'POST', body: payload })
      editingOrderId.value = resp._id // Subsequent autosaves will be updates
    }
    // Refresh global items so avg. cost updates magically across the app!
    await Promise.all([
      fetchItems(),
      fetchOrders()
    ])
  } catch (err) {
    console.error('Autosave failed:', err)
  } finally {
    isAutoSaving.value = false
  }
}

function linkSku(lineIndex: number, item: any) {
  const lineItem = previewLineItems.value[lineIndex]
  if (!lineItem) return
  lineItem.mappedItemId = item._id
  lineItem.mappedSku = item.itemSKU
  lineItem.mappedItemName = item.item
  if (item.category) {
    lineItem.category = item.category
  }
  lineItem.skuLinked = true
  lineItem._skuSearchOpen = false
  autoSavePO()
}

function unlinkSku(lineIndex: number) {
  const lineItem = previewLineItems.value[lineIndex]
  if (!lineItem) return
  lineItem.mappedItemId = ''
  lineItem.mappedSku = ''
  lineItem.mappedItemName = ''
  lineItem.skuLinked = false
  autoSavePO()
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
  const name = (previewHeader.value.vendorName || '').trim()
  if (!name) {
    toast.error('Vendor name is required')
    return
  }

  // Auto-resolve vendorId if they typed an exact match but didn't click it
  if (!previewHeader.value.vendorId) {
    const existing = vendors.value.find((v: any) => v.vendorName?.toLowerCase() === name.toLowerCase())
    if (existing) {
      previewHeader.value.vendorId = existing._id
    } else {
      saving.value = true
      try {
        const vendorBody: Record<string, any> = { vendorName: name }
        if (previewHeader.value.vendorPhone) vendorBody.phone = previewHeader.value.vendorPhone
        if (previewHeader.value.vendorEmail) vendorBody.email = previewHeader.value.vendorEmail
        if (previewHeader.value.vendorAddress) vendorBody.address = previewHeader.value.vendorAddress
        const res = await $fetch<any>('/api/vendors', {
          method: 'POST',
          body: vendorBody
        })
        await fetchVendors()
        previewHeader.value.vendorId = res._id
        toast.success(`Automatically added vendor: ${name}`)
      } catch (e: any) {
        toast.error('Failed to auto-create vendor')
        saving.value = false
        return
      }
    }
  }

  // Save SKU mappings for future auto-linking
  const vendorId = previewHeader.value.vendorId
  if (vendorId) {
    const mappingPromises = previewLineItems.value
      .filter(li => li.skuLinked && li.mappedItemId && li.vendorItemCode)
      .map(li =>
        $fetch<any>('/api/purchase-orders/sku-maps', {
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

  // Ensure locationName matches locationId before saving
  if (previewHeader.value.locationId) {
    const loc = locations.value.find((l: any) => l._id === previewHeader.value.locationId)
    previewHeader.value.locationName = loc?.name || ''
  } else {
    previewHeader.value.locationName = ''
  }

  const payload: Record<string, any> = {
    ...previewHeader.value,
    lineItems: cleanItems,
    ...previewFinancials.value,
    totalItems: cleanItems.length,
    pdfAttachment: pdfAttachment.value || undefined,
  }

  // Only set status to draft for new POs
  if (!editingOrderId.value) {
    payload.status = 'draft'
  }

  saving.value = true
  try {
    if (editingOrderId.value) {
      // Update existing PO
      await $fetch<any>(`/api/purchase-orders/${editingOrderId.value}`, { method: 'PUT', body: payload })
      toast.success('Purchase order updated successfully!')
    } else {
      // Create new PO
      await $fetch<any>('/api/purchase-orders', { method: 'POST', body: payload })
      toast.success('Purchase order saved successfully!')
    }
    showPreviewDialog.value = false
    editingOrderId.value = null
    await fetchOrders()
  }
  catch (err: any) {
    toast.error(err?.data?.message || 'Failed to save purchase order')
  }
  finally {
    saving.value = false
  }
}

// ─── Detail View (reuses preview dialog) ─────────────────────────────────────
async function openDetail(order: PurchaseOrder) {
  try {
    const full = await $fetch<PurchaseOrder>(`/api/purchase-orders/${order._id}`)
    editingOrderId.value = full._id
    
    previewHeader.value = {
      vendorId: full.vendorId,
      vendorName: full.vendorName || '',
      invoiceNumber: full.invoiceNumber || '',
      invoiceDate: full.invoiceDate || '',
      deliveryDate: full.deliveryDate || '',
      paymentDueDate: full.paymentDueDate || '',
      poNumber: full.poNumber || '',
      orderNumber: full.orderNumber || '',
      customerNumber: full.customerNumber || '',
      soldToName: full.soldToName || '',
      soldToAddress: full.soldToAddress || '',
      shipToName: full.shipToName || '',
      shipToAddress: full.shipToAddress || '',
      notes: full.notes || '',
      locationId: full.locationId || '',
      locationName: full.locationName || '',
    }

    previewFinancials.value = {
      subTotal: full.subTotal || 0,
      taxTotal: full.taxTotal || 0,
      otherCharges: full.otherCharges || 0,
      invoiceTotal: full.invoiceTotal || 0,
    }

    previewLineItems.value = (full.lineItems || []).map((item: any, idx: number) => ({
      ...item,
      lineNumber: idx + 1,
      _skuSearchOpen: false,
    }))

    pdfAttachment.value = full.pdfAttachment || null
    showPreviewDialog.value = true
  }
  catch {
    toast.error('Failed to load order details')
  }
}

// ─── Manual Create ────────────────────────────────────────────────────────────
function openManualCreate() {
  editingOrderId.value = null
  previewHeader.value = {
    vendorName: '',
    invoiceNumber: '',
    invoiceDate: '',
    deliveryDate: '',
    paymentDueDate: '',
    poNumber: '',
    orderNumber: '',
    customerNumber: '',
    soldToName: '',
    soldToAddress: '',
    shipToName: '',
    shipToAddress: '',
    notes: '',
  }
  previewFinancials.value = { subTotal: 0, taxTotal: 0, otherCharges: 0, invoiceTotal: 0 }
  previewLineItems.value = []
  pdfAttachment.value = null
  skuSearchQuery.value = {}
  showPreviewDialog.value = true
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
    await $fetch<any>(`/api/purchase-orders/${deletingOrder.value._id}`, { method: 'DELETE' })
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
        <Button variant="outline" size="sm" class="h-8 text-xs" @click="openManualCreate">
          <Icon name="i-lucide-plus" class="mr-1 size-3.5" />
          Create Manual
        </Button>
        <Button size="sm" class="h-8 text-xs" @click="showUploadDialog = true">
          <Icon name="i-lucide-upload" class="mr-1 size-3.5" />
          Upload Invoice
        </Button>
      </div>
    </Teleport>
  </ClientOnly>

  <div class="w-full flex flex-col lg:flex-row gap-6">
    <!-- Sub-Sidebar for Vendors -->
    <div class="lg:w-64 shrink-0 flex flex-col gap-4 w-full">
      <h3 class="text-xs font-semibold px-2 uppercase tracking-widest text-muted-foreground">Vendors</h3>
      <div class="flex flex-col gap-1 overflow-y-auto max-h-[80vh] scrollbar-thin px-1">
        <button
          class="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-colors text-left"
          :class="selectedFilterVendorId === null ? 'bg-primary text-primary-foreground font-medium shadow-sm' : 'hover:bg-muted text-muted-foreground hover:text-foreground'"
          @click="selectedFilterVendorId = null"
        >
          <span>All Vendors</span>
        </button>
        <button
          v-for="vs in vendorSummaries"
          :key="vs.vendorId"
          class="flex flex-col w-full px-3 py-2 rounded-lg text-xs transition-colors text-left gap-1"
          :class="selectedFilterVendorId === vs.vendorId ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-muted-foreground hover:text-foreground'"
          @click="selectedFilterVendorId = vs.vendorId"
        >
          <div class="flex items-center justify-between">
            <span class="truncate font-medium">{{ vs.vendorName }}</span>
            <span class="tabular-nums shrink-0 ml-2" :class="selectedFilterVendorId === vs.vendorId ? 'text-primary/70' : 'opacity-70'">{{ vs.totalOrders }}</span>
          </div>
          <span class="tabular-nums font-mono opacity-80" :class="selectedFilterVendorId === vs.vendorId ? 'text-primary' : ''">{{ fmt(vs.totalSum) }}</span>
        </button>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col gap-4 min-w-0">
      <!-- Top Filters Row -->
      <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4 w-full">
        <!-- Mobile Search -->
        <div class="sm:hidden relative flex-1">
          <Icon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input v-model="search" placeholder="Search orders..." class="pl-9 h-9" />
        </div>

        <div class="flex flex-wrap xl:flex-nowrap items-center gap-3 w-full">
          <!-- Status Filter Pills -->
          <div class="shrink-0 flex items-center gap-1 overflow-x-auto scrollbar-thin">
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
          
          <div class="flex-1 min-w-4" /> <!-- spacer -->

          <!-- Date Filters -->
          <div class="flex items-center gap-1.5 whitespace-nowrap bg-background rounded-lg p-1 border shadow-sm shrink-0">
            <Icon name="i-lucide-calendar" class="size-4 text-muted-foreground mx-1 shrink-0" />
            <Input v-model="dateFrom" type="date" class="h-8 text-xs bg-transparent border-none shadow-none w-[110px] sm:w-[130px] shrink-0" />
            <span class="text-muted-foreground text-xs shrink-0 px-1">to</span>
            <Input v-model="dateTo" type="date" class="h-8 text-xs bg-transparent border-none shadow-none w-[110px] sm:w-[130px] shrink-0" />
            <Button
              v-if="dateFrom || dateTo"
              variant="ghost"
              size="icon"
              class="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0 mr-0.5"
              @click="dateFrom = ''; dateTo = ''"
              title="Clear Dates"
            >
              <Icon name="i-lucide-x" class="size-3.5" />
            </Button>
          </div>
        </div>
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
                  <span class="font-medium text-sm">{{ order.vendorName }}</span>
                </div>
              </TableCell>
              <TableCell>
                <span class="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{{ order.invoiceNumber || '—' }}</span>
              </TableCell>
              <TableCell class="text-sm text-muted-foreground whitespace-nowrap">
                {{ fmtDate(order.invoiceDate) }}
              </TableCell>
              <TableCell>
                <span class="text-sm tabular-nums font-medium">{{ order.linkedItemCount || 0 }}/{{ order.totalItems }}</span>
              </TableCell>
              <TableCell>
                <span class="text-sm font-semibold tabular-nums">{{ fmt(order.invoiceTotal) }}</span>
              </TableCell>
              <TableCell @click.stop>
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <button
                      class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium transition-colors hover:ring-2 ring-primary/20 ring-offset-1 focus:outline-none"
                      :class="STATUS_CONFIG[order.status]?.color"
                      @click.prevent
                    >
                      <span class="size-1.5 rounded-full" :class="STATUS_CONFIG[order.status]?.dot" />
                      {{ STATUS_CONFIG[order.status]?.label }}
                      <Icon name="i-lucide-chevron-down" class="size-3 opacity-50 ml-0.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" class="w-40 min-w-[8rem]">
                    <DropdownMenuItem
                      v-for="s in Object.keys(STATUS_CONFIG)"
                      :key="s"
                      class="text-xs flex items-center gap-2 cursor-pointer"
                      @click="updateStatus(order, s)"
                    >
                      <span class="size-2 rounded-full" :class="STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.dot" />
                      {{ STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.label }}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
              <TableCell>
                <a
                  v-if="order.pdfAttachment?.secureUrl"
                  :href="`/api/purchase-orders/pdf/${order._id}`"
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
        v-if="!uploading"
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

      <!-- Beautiful AI Processing State -->
      <div 
        v-else 
        class="mt-2 relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10 flex flex-col items-center justify-center p-12 text-center animate-in fade-in zoom-in duration-500 shadow-xl"
      >
        <!-- Glowing orb behind icon -->
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-48 bg-primary/20 blur-[50px] rounded-full point-events-none"></div>

        <div class="relative z-10 size-20 rounded-full bg-background border border-primary/30 flex items-center justify-center mb-6 ring-8 ring-primary/5 shadow-[0_0_25px_rgba(var(--primary),0.2)]">
          <!-- Two spinning/pulsing icons overlaid -->
          <Icon name="i-lucide-sparkles" class="absolute size-8 text-primary animate-pulse" />
          <Icon name="i-lucide-loader-2" class="size-20 absolute text-primary/20 animate-spin" />
        </div>
        
        <h3 class="relative z-10 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60 mb-2">
          Gemini AI is Analyzing...
        </h3>
        
        <p class="relative z-10 text-sm text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
          Extracting tabular data, parsing codes, and generating structure. This cloud process takes around 5-10 seconds.
        </p>

        <div class="relative z-10 mt-8 w-full max-w-[200px]">
          <div class="h-1.5 w-full bg-primary/20 rounded-full overflow-hidden">
             <div class="h-full bg-primary rounded-full animate-pulse w-full"></div>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- PREVIEW / EDIT DIALOG                                                  -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <Dialog v-model:open="showPreviewDialog">
    <DialogContent class="max-w-[70vw] sm:max-w-[70vw] w-full max-h-[95vh] flex flex-col p-0 gap-0 [&>button:last-child]:hidden">
      <!-- Screen Reader Accessibility Requirements -->
      <DialogTitle class="sr-only">Purchase Order Details</DialogTitle>
      <DialogDescription class="sr-only">Review, edit, and save extracted invoice data.</DialogDescription>
      <!-- Header Bar -->
      <div class="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
        <div class="flex items-center gap-3">
          <div class="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon :name="editingOrderId ? 'i-lucide-file-pen-line' : 'i-lucide-file-check-2'" class="size-5 text-primary" />
          </div>
          <div>
            <p class="font-semibold text-sm">
              {{ editingOrderId ? 'Edit Purchase Order' : 'Review & Edit Extracted Data' }}
            </p>
            <p class="text-xs text-muted-foreground">
              {{ editingOrderId ? `Editing Invoice #${previewHeader.invoiceNumber || '—'}` : 'Verify all information is correct before saving' }}
              <span v-if="pdfAttachment" class="ml-2 text-emerald-600 dark:text-emerald-400">
                <Icon name="i-lucide-cloud-check" class="inline size-3 mr-0.5" />Cloud uploaded
              </span>
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <!-- Delete button (only for existing POs) -->
          <Button
            v-if="editingOrderId"
            variant="ghost"
            size="sm"
            class="h-8 text-xs text-destructive hover:text-destructive"
            @click="confirmDelete({ _id: editingOrderId } as any); showPreviewDialog = false"
          >
            <Icon name="i-lucide-trash-2" class="mr-1.5 size-3.5" />
            Delete
          </Button>
          <Button variant="outline" size="sm" class="h-8 text-xs" @click="showPreviewDialog = false; editingOrderId = null">
            Cancel
          </Button>
          <Button size="sm" class="h-8 text-xs" :disabled="saving" @click="handleSave">
            <Icon v-if="saving" name="i-lucide-loader-2" class="mr-1.5 size-3.5 animate-spin" />
            <Icon v-else name="i-lucide-check" class="mr-1.5 size-3.5" />
            {{ saving ? 'Saving...' : editingOrderId ? 'Update & Save' : 'Confirm & Save' }}
          </Button>
        </div>
      </div>

      <!-- Scrollable Body -->
      <div class="flex-1 overflow-y-auto overflow-x-hidden" style="overflow: auto; clip-path: none;">
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
              <div class="space-y-1.5 relative">
                <Label class="text-xs">Vendor Name *</Label>
                <Input 
                  v-model="previewHeader.vendorName" 
                  placeholder="Search or add vendor..." 
                  class="h-8 text-sm" 
                  @focus="vendorSearchOpen = true"
                  @blur="closeVendorDropdown"
                  @input="previewHeader.vendorId = ''"
                />
                <div
                  v-if="vendorSearchOpen"
                  class="absolute z-50 top-full left-0 mt-1 w-full bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto"
                >
                  <div
                    v-for="v in filteredVendors"
                    :key="v._id"
                    class="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                    @mousedown.prevent="selectVendor(v)"
                  >
                    {{ v.vendorName }}
                  </div>
                  <div 
                    v-if="!exactVendorMatch && previewHeader.vendorName.trim()"
                    class="px-3 py-2 hover:bg-muted cursor-pointer text-sm text-primary flex items-center gap-2 border-t"
                    @mousedown.prevent="addNewVendor"
                  >
                    <Icon name="i-lucide-plus" class="size-3.5" />
                    Add "{{ previewHeader.vendorName }}"
                  </div>
                </div>
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
              <div class="space-y-1.5">
                <Label class="text-xs">Location</Label>
                <select
                  v-model="previewHeader.locationId"
                  class="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  @change="onLocationChange"
                >
                  <option value="">Select location...</option>
                  <option v-for="loc in locations" :key="loc._id" :value="loc._id">
                    {{ loc.name }}
                  </option>
                </select>
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

            <div class="border rounded-lg overflow-visible">
              <div class="overflow-x-auto overflow-y-visible">
                <table class="w-full text-xs table-fixed">
                  <colgroup>
                    <col class="w-[36px]" /><!-- # -->
                    <col class="w-[110px]" /><!-- Vendor Code -->
                    <col /><!-- Description (takes equal remaining space) -->
                    <col class="w-[140px]" /><!-- Category -->
                    <col class="w-[70px]" /><!-- Qty -->
                    <col class="w-[80px]" /><!-- Unit -->
                    <col class="w-[100px]" /><!-- Cost -->
                    <col class="w-[110px]" /><!-- Amount -->
                    <col /><!-- Our SKU (takes equal remaining space) -->
                    <col class="w-[36px]" /><!-- Actions -->
                  </colgroup>
                  <thead class="bg-muted/50">
                    <tr>
                      <th class="px-3 py-2 text-left font-medium text-muted-foreground">#</th>
                      <th class="px-3 py-2 text-left font-medium text-muted-foreground">Vendor Code</th>
                      <th class="px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
                      <th class="px-3 py-2 text-left font-medium text-muted-foreground">Category</th>
                      <th class="px-3 py-2 text-left font-medium text-muted-foreground">Qty</th>
                      <th class="px-3 py-2 text-left font-medium text-muted-foreground">Unit</th>
                      <th class="px-3 py-2 text-left font-medium text-muted-foreground">Cost</th>
                      <th class="px-3 py-2 text-left font-medium text-muted-foreground">Amount</th>
                      <th class="px-3 py-2 text-left font-medium text-muted-foreground">Our SKU</th>
                      <th class="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody class="divide-y">
                    <!-- Category header rows -->
                    <template v-for="(lineItem, idx) in previewLineItems" :key="idx">
                      <tr
                        v-if="lineItem.category && (idx === 0 || lineItem.category !== previewLineItems[idx - 1]?.category)"
                        class="bg-primary/5 dark:bg-primary/10 border-y border-primary/10"
                      >
                        <td colspan="7" class="px-3 py-2">
                          <span class="text-[10px] font-bold uppercase tracking-widest text-primary/80 dark:text-primary/70">
                            {{ lineItem.category }}
                          </span>
                        </td>
                        <td colspan="3" class="px-3 py-2 text-left">
                          <span class="text-[11px] font-bold tabular-nums text-primary">
                            {{ fmt(categoryTotals[(lineItem.category || 'Uncategorized').trim().toUpperCase()] || 0) }}
                          </span>
                        </td>
                      </tr>
                      <tr 
                        :id="lineItem.mappedItemId ? 'row-' + lineItem.mappedItemId : ''"
                        class="hover:bg-muted/20 transition-colors duration-1000 group/row"
                        :class="[
                          highlightedItemId === lineItem.mappedItemId ? 'bg-amber-400/30 dark:bg-amber-500/30 ring-2 ring-primary/80 animate-pulse' : 
                          lineItem.skuLinked ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : ''
                        ]"
                      >
                        <td class="px-3 py-1.5 text-muted-foreground text-center">{{ lineItem.lineNumber }}</td>
                        <td class="px-3 py-1.5">
                          <Input
                            v-model="lineItem.vendorItemCode"
                            class="h-6 text-xs font-mono w-full"
                            placeholder="CODE"
                          />
                        </td>
                        <td class="px-3 py-1.5">
                          <Input
                            v-model="lineItem.description"
                            class="h-6 text-xs w-full"
                            placeholder="Description"
                          />
                        </td>
                        <td class="px-3 py-1.5">
                          <Input
                            v-model="lineItem.category"
                            class="h-6 text-xs w-full"
                            placeholder="—"
                          />
                        </td>
                        <td class="px-3 py-1.5">
                          <Input
                            v-model.number="lineItem.quantity"
                            type="number"
                            step="0.01"
                            class="h-6 text-xs text-left w-full"
                            @input="recalcLine(lineItem)"
                          />
                        </td>
                        <td class="px-3 py-1.5">
                          <Input v-model="lineItem.unit" class="h-6 text-xs w-full" placeholder="EA" />
                        </td>
                        <td class="px-3 py-1.5">
                          <Input
                            v-model.number="lineItem.unitPrice"
                            type="number"
                            step="0.01"
                            class="h-6 text-xs text-left w-full"
                            @input="recalcLine(lineItem)"
                          />
                        </td>
                        <td class="px-3 py-1.5 text-left font-mono font-semibold tabular-nums whitespace-nowrap">
                          {{ fmt(lineItem.extendedPrice) }}
                        </td>
                        <td class="px-3 py-1.5">
                          <!-- SKU Linker -->
                          <div v-if="lineItem.skuLinked" class="flex items-center gap-1.5">
                            <NuxtLink
                              :to="`/inventory/items/${lineItem.mappedItemId}`"
                              class="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 rounded text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-800/40 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors text-[10px] font-medium flex-1 min-w-0 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              title="View Item Details"
                            >
                              <Icon name="i-lucide-arrow-right" class="size-2.5 shrink-0" />
                              <div class="min-w-0 truncate">
                                <span class="font-semibold">{{ lineItem.mappedItemName || '—' }}</span>
                                <span v-if="lineItem.mappedSku" class="opacity-70 ml-1">({{ lineItem.mappedSku }})</span>
                              </div>
                            </NuxtLink>
                            <Button variant="ghost" size="icon" class="size-5 text-muted-foreground hover:text-destructive" @click="unlinkSku(idx)">
                              <Icon name="i-lucide-x" class="size-2.5" />
                            </Button>
                          </div>
                          <div v-else class="relative group/sku w-full">
                            <Popover v-model:open="lineItem._skuSearchOpen" @update:open="(isOpen) => { if(isOpen) skuSearchQuery[String(idx)] = '' }">
                              <PopoverTrigger as-child>
                                <button
                                  type="button"
                                  class="flex h-6 w-full items-center justify-between rounded-md border border-input bg-background px-2 text-[10px] font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground"
                                >
                                  <span class="text-muted-foreground truncate">Select SKU...</span>
                                  <Icon name="i-lucide-chevrons-up-down" class="size-3 shrink-0 opacity-50" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent
                                class="p-0 w-72 max-h-72 flex flex-col shadow-2xl overflow-hidden"
                                align="start"
                                :side-offset="4"
                              >
                                <div class="flex items-center border-b px-2.5 py-2">
                                  <Icon name="i-lucide-search" class="size-3.5 text-muted-foreground mr-2 shrink-0" />
                                  <input
                                    v-model="skuSearchQuery[String(idx)]"
                                    class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                    placeholder="Search items..."
                                    autofocus
                                  >
                                </div>
                                <div class="flex-1 overflow-y-auto max-h-48 py-1">
                                  <div v-if="filteredItemsForSku(idx).length === 0 && !skuSearchQuery[String(idx)]?.trim()" class="px-3 py-4 text-xs text-muted-foreground text-center">
                                    Type to search items...
                                  </div>
                                  <div
                                    v-for="item in filteredItemsForSku(idx)"
                                    :key="item._id"
                                    class="px-2.5 py-1.5 hover:bg-muted cursor-pointer transition-colors"
                                    @click="linkSku(idx, item)"
                                  >
                                    <p class="font-medium text-xs truncate">{{ item.item }}</p>
                                    <p class="text-[10px] text-muted-foreground font-mono">{{ item.itemSKU || 'No SKU' }}</p>
                                  </div>
                                  <div v-if="filteredItemsForSku(idx).length === 0 && skuSearchQuery[String(idx)]?.trim()" class="px-3 py-4 text-xs text-center text-muted-foreground">
                                    No exact match found.
                                  </div>
                                </div>
                                <div class="border-t p-1 bg-muted/5">
                                  <button
                                    type="button"
                                    class="w-full flex items-center gap-2 rounded-md px-2 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                    @click="openNewItemDialog(idx)"
                                  >
                                    <Icon name="i-lucide-plus-circle" class="size-3.5 text-emerald-500 shrink-0" />
                                    <span class="truncate font-medium">
                                      {{ skuSearchQuery[String(idx)]?.trim() ? `Add "${skuSearchQuery[String(idx)]?.trim()}"` : 'Add new item to inventory' }}
                                    </span>
                                  </button>
                                </div>
                              </PopoverContent>
                            </Popover>
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
            <a v-if="editingOrderId" :href="`/api/purchase-orders/pdf/${editingOrderId}`" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" class="h-7 text-xs gap-1.5">
                <Icon name="i-lucide-eye" class="size-3.5" />
                Preview File
              </Button>
            </a>
            <a v-else-if="pdfAttachment?.cloudinaryPublicId" :href="`/api/cloudinary/proxy?publicId=${encodeURIComponent(pdfAttachment.cloudinaryPublicId)}&filename=${encodeURIComponent(pdfAttachment.originalFileName || 'document.pdf')}`" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" class="h-7 text-xs gap-1.5">
                <Icon name="i-lucide-eye" class="size-3.5" />
                Preview File
              </Button>
            </a>
          </div>
        </div>
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

