<script setup lang="ts">
import { toast } from 'vue-sonner'

useHead({ title: 'Orders — The Culture Gourmet' })

// ─── Types ────────────────────────────────────────────────────────────────────
interface Order {
  id: string
  OrderID: string
  ClientId: string
  Name: string
  Phone: string
  Email: string
  Company: string
  ContactMethod: string
  OtherContactMethod: string
  TypeOfEvent: string
  OtherTypeOfEvent: string
  EventDetails: string
  Date: string
  StartTime: string
  EndTime: string
  Venue: string
  Guests: string
  Setting: string
  Preferences: string
  ServiceStyle: string
  OtherStyle: string
  Theme: string
  Allergies: string
  ServicesNeeded: string
  OtherServicesNeeded: string
  Budget: string
  BudgetAdditionalInfo: string
  MenuRecommendations: string
  NeedSetup: string
  HowDoYouKnow: string
  OtherHowToKnow: string
  Comments: string
  TimeStamp: string
  Status: string
}

// ─── Status config ─────────────────────────────────────────────────────────────
const statusOptions = ['New', 'In Review', 'Confirmed', 'In Progress', 'Completed', 'Cancelled']

const statusStyles: Record<string, string> = {
  'New': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'In Review': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'Confirmed': 'bg-violet-500/10 text-violet-700 border-violet-500/20',
  'In Progress': 'bg-teal-500/10 text-teal-700 border-teal-500/20',
  'Completed': 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  'Cancelled': 'bg-red-500/10 text-red-600 border-red-500/20',
}

// ─── Seed data ─────────────────────────────────────────────────────────────────
const defaultOrders: Order[] = [
  {
    id: 'ord-001', OrderID: 'ORD-2026-001', ClientId: 'CLT-001', Name: 'Sarah Johnson',
    Phone: '+1 (555) 200-1111', Email: 'sarah.j@techvision.com', Company: 'TechVision Inc',
    ContactMethod: 'Email', OtherContactMethod: '', TypeOfEvent: 'Corporate Dinner',
    OtherTypeOfEvent: '', EventDetails: 'Annual board dinner for 40 executives. Black-tie setting.',
    Date: '2026-03-15', StartTime: '7:00 PM', EndTime: '11:00 PM',
    Venue: 'The Grand Ballroom, Ritz Carlton', Guests: '40', Setting: 'Indoor',
    Preferences: 'Halal options required for 5 guests', ServiceStyle: 'Plated', OtherStyle: '',
    Theme: 'Black & Gold Gala', Allergies: 'Nuts, Shellfish', ServicesNeeded: 'Catering, Setup, Waitstaff',
    OtherServicesNeeded: '', Budget: '$15,000', BudgetAdditionalInfo: 'Flexible for premium menu upgrades',
    MenuRecommendations: '3-course fine dining, sommelier service', NeedSetup: 'Yes',
    HowDoYouKnow: 'Referral', OtherHowToKnow: '', Comments: 'Client prefers pre-event tasting session',
    TimeStamp: '2026-02-10T09:15:00Z', Status: 'Confirmed',
  },
  {
    id: 'ord-002', OrderID: 'ORD-2026-002', ClientId: 'CLT-002', Name: 'Michael Chen',
    Phone: '+1 (555) 300-2222', Email: 'mchen@globalsoft.com', Company: 'GlobalSoft',
    ContactMethod: 'Phone', OtherContactMethod: '', TypeOfEvent: 'Wedding Reception',
    OtherTypeOfEvent: '', EventDetails: 'Outdoor garden wedding reception. Romantic and elegant.',
    Date: '2026-04-20', StartTime: '4:00 PM', EndTime: '10:00 PM', Venue: 'Sunset Gardens Estate',
    Guests: '150', Setting: 'Outdoor', Preferences: 'Vegan-friendly menu with vegetarian alternatives',
    ServiceStyle: 'Buffet', OtherStyle: '', Theme: 'Garden Floral', Allergies: 'Gluten',
    ServicesNeeded: 'Catering, Bar Service, Cake', OtherServicesNeeded: '', Budget: '$25,000',
    BudgetAdditionalInfo: '', MenuRecommendations: 'Mediterranean spread with custom wedding cake',
    NeedSetup: 'Yes', HowDoYouKnow: 'Instagram', OtherHowToKnow: '',
    Comments: 'Couple wants tasting menu in March', TimeStamp: '2026-02-12T11:00:00Z', Status: 'In Review',
  },
  {
    id: 'ord-003', OrderID: 'ORD-2026-003', ClientId: 'CLT-003', Name: 'Emily Rodriguez',
    Phone: '+1 (555) 400-3333', Email: 'e.rod@meridian.com', Company: '', ContactMethod: 'Website Form',
    OtherContactMethod: '', TypeOfEvent: 'Birthday Party', OtherTypeOfEvent: '',
    EventDetails: 'Surprise 50th birthday party. Casual and fun.', Date: '2026-03-28',
    StartTime: '6:00 PM', EndTime: '10:00 PM', Venue: 'Private Residence', Guests: '60',
    Setting: 'Indoor', Preferences: 'Latin-fusion cuisine', ServiceStyle: 'Stations', OtherStyle: '',
    Theme: 'Fiesta', Allergies: 'None', ServicesNeeded: 'Catering, Waitstaff', OtherServicesNeeded: '',
    Budget: '$6,000', BudgetAdditionalInfo: 'Budget is firm',
    MenuRecommendations: 'Taco bar, empanadas, churros station', NeedSetup: 'Yes',
    HowDoYouKnow: 'Google Search', OtherHowToKnow: '', Comments: 'Need allergen cards on all stations',
    TimeStamp: '2026-02-14T08:30:00Z', Status: 'New',
  },
  {
    id: 'ord-004', OrderID: 'ORD-2026-004', ClientId: 'CLT-004', Name: 'James Wilson',
    Phone: '+1 (555) 500-4444', Email: 'jwilson@nexgen.io', Company: 'NexGen Solutions',
    ContactMethod: 'Email', OtherContactMethod: '', TypeOfEvent: 'Conference Lunch',
    OtherTypeOfEvent: '', EventDetails: '2-day technology conference. Lunch service both days.',
    Date: '2026-05-08', StartTime: '12:00 PM', EndTime: '2:00 PM',
    Venue: 'NexGen HQ, Conference Center', Guests: '200', Setting: 'Indoor',
    Preferences: 'Quick service, dietary labels on all items', ServiceStyle: 'Buffet', OtherStyle: '',
    Theme: 'Modern Clean', Allergies: 'Various — need allergen labels',
    ServicesNeeded: 'Catering, Setup, Cleanup', OtherServicesNeeded: '', Budget: '$12,000',
    BudgetAdditionalInfo: 'Per day: $6,000',
    MenuRecommendations: 'Build-your-own grain bowls, sandwiches, salads', NeedSetup: 'Yes',
    HowDoYouKnow: 'LinkedIn', OtherHowToKnow: '', Comments: 'Repeat client — handled their 2025 conference',
    TimeStamp: '2026-02-16T10:00:00Z', Status: 'Confirmed',
  },
  {
    id: 'ord-005', OrderID: 'ORD-2026-005', ClientId: 'CLT-005', Name: 'Priya Patel',
    Phone: '+1 (555) 600-5555', Email: 'ppatel@dataflow.ai', Company: '', ContactMethod: 'Referral',
    OtherContactMethod: '', TypeOfEvent: 'Bridal Shower', OtherTypeOfEvent: '',
    EventDetails: 'Elegant high-tea bridal shower for the bride-to-be.', Date: '2026-03-22',
    StartTime: '2:00 PM', EndTime: '6:00 PM', Venue: 'The Ivy Room', Guests: '30', Setting: 'Indoor',
    Preferences: 'High-tea service, floral presentation', ServiceStyle: 'Plated', OtherStyle: '',
    Theme: 'Blush & White', Allergies: 'Dairy', ServicesNeeded: 'Catering, Florals, Waitstaff',
    OtherServicesNeeded: 'Custom cake', Budget: '$4,500', BudgetAdditionalInfo: '',
    MenuRecommendations: 'Tea sandwiches, scones, macarons, mini pastries', NeedSetup: 'Yes',
    HowDoYouKnow: 'Friend Referral', OtherHowToKnow: '', Comments: '',
    TimeStamp: '2026-02-18T15:00:00Z', Status: 'Completed',
  },
]

// ─── State ────────────────────────────────────────────────────────────────────
const storageKey = 'tcg-orders-v1'
const orders = ref<Order[]>([])

onMounted(() => {
  try {
    const saved = localStorage.getItem(storageKey)
    orders.value = saved ? JSON.parse(saved) : [...defaultOrders]
  }
  catch {
    orders.value = [...defaultOrders]
  }
})

function persist() {
  localStorage.setItem(storageKey, JSON.stringify(orders.value))
}

// ─── Filters ──────────────────────────────────────────────────────────────────
const search = ref('')
const statusFilter = ref('All')
const currentPage = ref(1)
const perPage = 10

const filtered = computed(() => {
  let list = orders.value
  if (statusFilter.value !== 'All')
    list = list.filter(o => o.Status === statusFilter.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(o =>
      o.Name.toLowerCase().includes(q)
      || o.Email.toLowerCase().includes(q)
      || o.OrderID.toLowerCase().includes(q)
      || o.TypeOfEvent.toLowerCase().includes(q)
      || o.Venue.toLowerCase().includes(q)
      || o.Company.toLowerCase().includes(q),
    )
  }
  return list
})

const totalPages = computed(() => Math.ceil(filtered.value.length / perPage))
const paginated = computed(() => {
  const start = (currentPage.value - 1) * perPage
  return filtered.value.slice(start, start + perPage)
})
watch([search, statusFilter], () => { currentPage.value = 1 })

// ─── Detail Sheet ─────────────────────────────────────────────────────────────
const selectedOrder = ref<Order | null>(null)
const showSheet = ref(false)

function viewOrder(order: Order) {
  selectedOrder.value = { ...order }
  showSheet.value = true
}

// ─── Create / Edit Dialog ─────────────────────────────────────────────────────
const showDialog = ref(false)
const formTab = ref('client')
const editingOrder = ref<Order | null>(null)
const form = ref<Partial<Order>>({})

function blankForm(): Partial<Order> {
  return {
    OrderID: `ORD-${new Date().getFullYear()}-${String(orders.value.length + 1).padStart(3, '0')}`,
    ClientId: '', Name: '', Phone: '', Email: '', Company: '', ContactMethod: '',
    OtherContactMethod: '', TypeOfEvent: '', OtherTypeOfEvent: '', EventDetails: '',
    Date: '', StartTime: '', EndTime: '', Venue: '', Guests: '', Setting: '', Preferences: '',
    ServiceStyle: '', OtherStyle: '', Theme: '', Allergies: '', ServicesNeeded: '',
    OtherServicesNeeded: '', Budget: '', BudgetAdditionalInfo: '', MenuRecommendations: '',
    NeedSetup: '', HowDoYouKnow: '', OtherHowToKnow: '', Comments: '',
    Status: 'New', TimeStamp: new Date().toISOString(),
  }
}

function openCreate() {
  editingOrder.value = null
  form.value = blankForm()
  formTab.value = 'client'
  showDialog.value = true
}

function openEdit(order: Order) {
  editingOrder.value = order
  form.value = { ...order }
  formTab.value = 'client'
  showDialog.value = true
}

function handleSave() {
  if (editingOrder.value) {
    const idx = orders.value.findIndex(o => o.id === editingOrder.value!.id)
    if (idx !== -1)
      orders.value[idx] = { ...editingOrder.value, ...form.value } as Order
    toast.success('Order updated')
  }
  else {
    orders.value.unshift({ id: `ord-${Date.now()}`, ...form.value } as Order)
    toast.success('Order created')
  }
  persist()
  showDialog.value = false
}

// ─── Delete ───────────────────────────────────────────────────────────────────
const showDeleteDialog = ref(false)
const deletingId = ref<string | null>(null)

function confirmDelete(id: string) {
  deletingId.value = id
  showDeleteDialog.value = true
}

function handleDelete() {
  orders.value = orders.value.filter(o => o.id !== deletingId.value)
  persist()
  showDeleteDialog.value = false
  toast.success('Order deleted')
}

// ─── Status quick-update ──────────────────────────────────────────────────────
function setStatus(order: Order, status: string) {
  const idx = orders.value.findIndex(o => o.id === order.id)
  if (idx !== -1) {
    orders.value[idx]!.Status = status
    if (selectedOrder.value?.id === order.id)
      selectedOrder.value!.Status = status
    persist()
    toast.success(`Status updated to ${status}`)
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(v: string) {
  if (!v) return '—'
  try { return new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) }
  catch { return v }
}

function formatTS(v: string) {
  if (!v) return '—'
  try { return new Date(v).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) }
  catch { return v }
}

function initials(name: string) {
  return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??'
}

// ─── Stats ────────────────────────────────────────────────────────────────────
const stats = computed(() => ({
  total: orders.value.length,
  confirmed: orders.value.filter(o => o.Status === 'Confirmed').length,
  inProgress: orders.value.filter(o => o.Status === 'In Progress').length,
  completed: orders.value.filter(o => o.Status === 'Completed').length,
}))

const { setHeader } = usePageHeader()
setHeader({ title: 'Orders', description: 'Catering & event order management', icon: 'i-lucide-notebook-pen' })
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Stats Row -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card class="p-4 flex items-center gap-4">
        <div class="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon name="i-lucide-notebook-pen" class="size-5 text-primary" />
        </div>
        <div>
          <p class="text-xs text-muted-foreground font-medium">Total Orders</p>
          <p class="text-2xl font-bold tabular-nums">{{ stats.total }}</p>
        </div>
      </Card>
      <Card class="p-4 flex items-center gap-4">
        <div class="size-10 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
          <Icon name="i-lucide-check-circle-2" class="size-5 text-violet-600" />
        </div>
        <div>
          <p class="text-xs text-muted-foreground font-medium">Confirmed</p>
          <p class="text-2xl font-bold tabular-nums">{{ stats.confirmed }}</p>
        </div>
      </Card>
      <Card class="p-4 flex items-center gap-4">
        <div class="size-10 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0">
          <Icon name="i-lucide-chef-hat" class="size-5 text-teal-600" />
        </div>
        <div>
          <p class="text-xs text-muted-foreground font-medium">In Progress</p>
          <p class="text-2xl font-bold tabular-nums">{{ stats.inProgress }}</p>
        </div>
      </Card>
      <Card class="p-4 flex items-center gap-4">
        <div class="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
          <Icon name="i-lucide-party-popper" class="size-5 text-emerald-600" />
        </div>
        <div>
          <p class="text-xs text-muted-foreground font-medium">Completed</p>
          <p class="text-2xl font-bold tabular-nums">{{ stats.completed }}</p>
        </div>
      </Card>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2 flex-1">
        <div class="relative max-w-xs flex-1">
          <Icon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input v-model="search" placeholder="Search orders..." class="pl-9" />
        </div>
        <div class="flex items-center gap-1 flex-wrap">
          <Button
            v-for="s in ['All', ...statusOptions]"
            :key="s"
            size="sm"
            :variant="statusFilter === s ? 'default' : 'outline'"
            class="text-xs h-8"
            @click="statusFilter = s"
          >
            {{ s }}
          </Button>
        </div>
      </div>
      <Button size="sm" @click="openCreate">
        <Icon name="i-lucide-plus" class="mr-1 size-4" />
        New Order
      </Button>
    </div>

    <!-- Table -->
    <Card>
      <div class="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Event Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Venue</TableHead>
              <TableHead>Guests</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Status</TableHead>
              <TableHead class="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="order in paginated"
              :key="order.id"
              class="group cursor-pointer"
              @click="viewOrder(order)"
            >
              <TableCell>
                <div>
                  <p class="font-mono text-xs font-semibold text-primary">{{ order.OrderID }}</p>
                  <p class="text-xs text-muted-foreground mt-0.5">{{ formatTS(order.TimeStamp) }}</p>
                </div>
              </TableCell>
              <TableCell>
                <div class="flex items-center gap-2.5">
                  <Avatar class="size-7 border shrink-0">
                    <AvatarFallback class="text-[10px]">{{ initials(order.Name) }}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p class="font-medium text-sm leading-tight">{{ order.Name }}</p>
                    <p class="text-xs text-muted-foreground leading-tight">{{ order.Email }}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span class="text-sm">{{ order.TypeOfEvent || order.OtherTypeOfEvent || '—' }}</span>
              </TableCell>
              <TableCell>
                <span class="text-sm text-muted-foreground">{{ formatDate(order.Date) }}</span>
              </TableCell>
              <TableCell>
                <span class="text-sm max-w-[180px] truncate block">{{ order.Venue || '—' }}</span>
              </TableCell>
              <TableCell>
                <span class="text-sm tabular-nums">{{ order.Guests || '—' }}</span>
              </TableCell>
              <TableCell>
                <span class="text-sm font-medium">{{ order.Budget || '—' }}</span>
              </TableCell>
              <TableCell>
                <Badge variant="outline" :class="statusStyles[order.Status] || 'bg-gray-500/10 text-gray-600 border-gray-500/20'">
                  {{ order.Status }}
                </Badge>
              </TableCell>
              <TableCell class="text-right" @click.stop>
                <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" class="size-8" @click="openEdit(order)">
                    <Icon name="i-lucide-pencil" class="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" class="size-8 text-destructive hover:text-destructive" @click="confirmDelete(order.id)">
                    <Icon name="i-lucide-trash-2" class="size-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-if="paginated.length === 0">
              <TableCell colspan="9" class="h-32 text-center">
                <div class="flex flex-col items-center gap-2 text-muted-foreground">
                  <Icon name="i-lucide-inbox" class="size-8" />
                  <p>No orders found</p>
                  <Button size="sm" variant="outline" @click="openCreate">
                    <Icon name="i-lucide-plus" class="mr-1 size-4" /> New Order
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </Card>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-between">
      <p class="text-sm text-muted-foreground">
        Showing {{ (currentPage - 1) * perPage + 1 }}–{{ Math.min(currentPage * perPage, filtered.length) }} of {{ filtered.length }}
      </p>
      <div class="flex gap-2">
        <Button variant="outline" size="sm" :disabled="currentPage <= 1" @click="currentPage--">
          <Icon name="i-lucide-chevron-left" class="size-4 mr-1" /> Previous
        </Button>
        <Button variant="outline" size="sm" :disabled="currentPage >= totalPages" @click="currentPage++">
          Next <Icon name="i-lucide-chevron-right" class="size-4 ml-1" />
        </Button>
      </div>
    </div>

    <!-- ── Detail Sheet ── -->
    <Sheet v-model:open="showSheet">
      <SheetContent class="w-full sm:max-w-2xl overflow-y-auto" side="right">
        <template v-if="selectedOrder">
          <SheetHeader class="pb-4 border-b">
            <div class="flex items-center justify-between gap-4">
              <div>
                <SheetTitle class="font-mono text-primary text-lg">{{ selectedOrder.OrderID }}</SheetTitle>
                <SheetDescription>{{ formatTS(selectedOrder.TimeStamp) }}</SheetDescription>
              </div>
              <Select :model-value="selectedOrder.Status" @update:model-value="(v: any) => setStatus(selectedOrder!, v as string)">
                <SelectTrigger class="w-36 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="s in statusOptions" :key="s" :value="s">{{ s }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </SheetHeader>
          <div class="py-6 space-y-8">
            <div>
              <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <Icon name="i-lucide-user" class="size-3.5" /> Client Information
              </h3>
              <div class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div><p class="text-muted-foreground text-xs mb-0.5">Name</p><p class="font-medium">{{ selectedOrder.Name || '—' }}</p></div>
                <div><p class="text-muted-foreground text-xs mb-0.5">Client ID</p><p class="font-mono text-xs">{{ selectedOrder.ClientId || '—' }}</p></div>
                <div><p class="text-muted-foreground text-xs mb-0.5">Phone</p><p>{{ selectedOrder.Phone || '—' }}</p></div>
                <div><p class="text-muted-foreground text-xs mb-0.5">Email</p><p class="break-all">{{ selectedOrder.Email || '—' }}</p></div>
                <div><p class="text-muted-foreground text-xs mb-0.5">Company</p><p>{{ selectedOrder.Company || '—' }}</p></div>
                <div>
                  <p class="text-muted-foreground text-xs mb-0.5">Contact Method</p>
                  <p>{{ selectedOrder.ContactMethod || '—' }}{{ selectedOrder.OtherContactMethod ? ` (${selectedOrder.OtherContactMethod})` : '' }}</p>
                </div>
              </div>
            </div>
            <Separator />
            <div>
              <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <Icon name="i-lucide-calendar-heart" class="size-3.5" /> Event Information
              </h3>
              <div class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <p class="text-muted-foreground text-xs mb-0.5">Type of Event</p>
                  <p>{{ selectedOrder.TypeOfEvent || selectedOrder.OtherTypeOfEvent || '—' }}</p>
                </div>
                <div><p class="text-muted-foreground text-xs mb-0.5">Date</p><p>{{ formatDate(selectedOrder.Date) }}</p></div>
                <div><p class="text-muted-foreground text-xs mb-0.5">Start Time</p><p>{{ selectedOrder.StartTime || '—' }}</p></div>
                <div><p class="text-muted-foreground text-xs mb-0.5">End Time</p><p>{{ selectedOrder.EndTime || '—' }}</p></div>
                <div class="col-span-2"><p class="text-muted-foreground text-xs mb-0.5">Venue</p><p>{{ selectedOrder.Venue || '—' }}</p></div>
                <div><p class="text-muted-foreground text-xs mb-0.5">Guests</p><p>{{ selectedOrder.Guests || '—' }}</p></div>
                <div><p class="text-muted-foreground text-xs mb-0.5">Setting</p><p>{{ selectedOrder.Setting || '—' }}</p></div>
                <div>
                  <p class="text-muted-foreground text-xs mb-0.5">Service Style</p>
                  <p>{{ selectedOrder.ServiceStyle || selectedOrder.OtherStyle || '—' }}</p>
                </div>
                <div><p class="text-muted-foreground text-xs mb-0.5">Theme</p><p>{{ selectedOrder.Theme || '—' }}</p></div>
                <div class="col-span-2"><p class="text-muted-foreground text-xs mb-0.5">Event Details</p><p>{{ selectedOrder.EventDetails || '—' }}</p></div>
                <div class="col-span-2"><p class="text-muted-foreground text-xs mb-0.5">Preferences</p><p>{{ selectedOrder.Preferences || '—' }}</p></div>
                <div class="col-span-2"><p class="text-muted-foreground text-xs mb-0.5">Allergies / Dietary</p><p>{{ selectedOrder.Allergies || 'None noted' }}</p></div>
                <div class="col-span-2">
                  <p class="text-muted-foreground text-xs mb-0.5">Services Needed</p>
                  <p>{{ selectedOrder.ServicesNeeded || '—' }}{{ selectedOrder.OtherServicesNeeded ? `, ${selectedOrder.OtherServicesNeeded}` : '' }}</p>
                </div>
              </div>
            </div>
            <Separator />
            <div>
              <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <Icon name="i-lucide-wallet" class="size-3.5" /> Budget & Logistics
              </h3>
              <div class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div><p class="text-muted-foreground text-xs mb-0.5">Budget</p><p class="font-semibold text-primary">{{ selectedOrder.Budget || '—' }}</p></div>
                <div><p class="text-muted-foreground text-xs mb-0.5">Need Setup</p><p>{{ selectedOrder.NeedSetup || '—' }}</p></div>
                <div class="col-span-2"><p class="text-muted-foreground text-xs mb-0.5">Budget Notes</p><p>{{ selectedOrder.BudgetAdditionalInfo || '—' }}</p></div>
                <div class="col-span-2"><p class="text-muted-foreground text-xs mb-0.5">Menu Recommendations</p><p>{{ selectedOrder.MenuRecommendations || '—' }}</p></div>
                <div>
                  <p class="text-muted-foreground text-xs mb-0.5">How did they find us?</p>
                  <p>{{ selectedOrder.HowDoYouKnow || '—' }}{{ selectedOrder.OtherHowToKnow ? ` (${selectedOrder.OtherHowToKnow})` : '' }}</p>
                </div>
              </div>
            </div>
            <div v-if="selectedOrder.Comments">
              <Separator class="mb-6" />
              <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <Icon name="i-lucide-message-square" class="size-3.5" /> Comments
              </h3>
              <p class="text-sm bg-muted/40 rounded-lg p-3 leading-relaxed">{{ selectedOrder.Comments }}</p>
            </div>
          </div>
          <SheetFooter class="border-t pt-4 flex gap-2">
            <Button variant="outline" class="flex-1" @click="openEdit(selectedOrder); showSheet = false">
              <Icon name="i-lucide-pencil" class="mr-2 size-4" /> Edit Order
            </Button>
            <Button variant="destructive" size="icon" @click="confirmDelete(selectedOrder.id); showSheet = false">
              <Icon name="i-lucide-trash-2" class="size-4" />
            </Button>
          </SheetFooter>
        </template>
      </SheetContent>
    </Sheet>

    <!-- ── Create / Edit Dialog ── -->
    <Dialog v-model:open="showDialog">
      <DialogContent class="sm:max-w-3xl p-0 gap-0 overflow-hidden">
        <!-- Header -->
        <DialogHeader class="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>{{ editingOrder ? 'Edit Order' : 'New Order' }}</DialogTitle>
          <DialogDescription>
            {{ editingOrder ? `Editing ${editingOrder.OrderID}` : 'Create a new catering/event order' }}
          </DialogDescription>
        </DialogHeader>

        <form @submit.prevent="handleSave" class="flex flex-1 overflow-hidden" style="height: 520px;">
          <!-- Left nav -->
          <nav class="w-44 shrink-0 border-r bg-muted/30 flex flex-col gap-1 p-3">
            <button
              v-for="tab in [
                { id: 'client', label: 'Client Info', icon: 'i-lucide-user' },
                { id: 'event',  label: 'Event Info',  icon: 'i-lucide-calendar-heart' },
                { id: 'budget', label: 'Budget',       icon: 'i-lucide-wallet' },
                { id: 'others', label: 'Others',       icon: 'i-lucide-more-horizontal' },
              ]"
              :key="tab.id"
              type="button"
              :class="[
                'flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors',
                formTab === tab.id
                  ? 'bg-background text-foreground font-medium shadow-sm border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/60',
              ]"
              @click="formTab = tab.id"
            >
              <Icon :name="tab.icon" class="size-4 shrink-0" />
              {{ tab.label }}
            </button>
          </nav>

          <!-- Right content -->
          <div class="flex-1 flex flex-col overflow-hidden">
            <div class="flex-1 overflow-y-auto p-5">

              <!-- Tab: Client Information -->
              <div v-show="formTab === 'client'" class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <Label>Client ID</Label>
                  <Input v-model="form.ClientId" placeholder="CLT-001" />
                </div>
                <div class="space-y-1.5">
                  <Label>Full Name *</Label>
                  <Input v-model="form.Name" placeholder="Jane Smith" required />
                </div>
                <div class="space-y-1.5">
                  <Label>Phone</Label>
                  <Input v-model="form.Phone" placeholder="+1 (555) 000-0000" />
                </div>
                <div class="space-y-1.5">
                  <Label>Email</Label>
                  <Input v-model="form.Email" type="email" placeholder="jane@example.com" />
                </div>
                <div class="space-y-1.5">
                  <Label>Company</Label>
                  <Input v-model="form.Company" placeholder="Acme Corp" />
                </div>
                <div class="space-y-1.5">
                  <Label>Contact Method</Label>
                  <Select v-model="form.ContactMethod">
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Email">Email</SelectItem>
                      <SelectItem value="Phone">Phone</SelectItem>
                      <SelectItem value="Website Form">Website Form</SelectItem>
                      <SelectItem value="Referral">Referral</SelectItem>
                      <SelectItem value="Instagram">Instagram</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div v-if="form.ContactMethod === 'Other'" class="col-span-2 space-y-1.5">
                  <Label>Other Contact Method</Label>
                  <Input v-model="form.OtherContactMethod" placeholder="Specify..." />
                </div>
              </div>

              <!-- Tab: Event Information -->
              <div v-show="formTab === 'event'" class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <Label>Type of Event *</Label>
                  <Select v-model="form.TypeOfEvent">
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Wedding Reception">Wedding Reception</SelectItem>
                      <SelectItem value="Corporate Dinner">Corporate Dinner</SelectItem>
                      <SelectItem value="Birthday Party">Birthday Party</SelectItem>
                      <SelectItem value="Bridal Shower">Bridal Shower</SelectItem>
                      <SelectItem value="Baby Shower">Baby Shower</SelectItem>
                      <SelectItem value="Conference Lunch">Conference Lunch</SelectItem>
                      <SelectItem value="Gala">Gala</SelectItem>
                      <SelectItem value="Cocktail Party">Cocktail Party</SelectItem>
                      <SelectItem value="Graduation">Graduation</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div v-if="form.TypeOfEvent === 'Other'" class="space-y-1.5">
                  <Label>Other Event Type</Label>
                  <Input v-model="form.OtherTypeOfEvent" placeholder="Specify..." />
                </div>
                <div class="space-y-1.5">
                  <Label>Date</Label>
                  <Input v-model="form.Date" type="date" />
                </div>
                <div class="space-y-1.5">
                  <Label>Start Time</Label>
                  <Input v-model="form.StartTime" placeholder="6:00 PM" />
                </div>
                <div class="space-y-1.5">
                  <Label>End Time</Label>
                  <Input v-model="form.EndTime" placeholder="10:00 PM" />
                </div>
                <div class="col-span-2 space-y-1.5">
                  <Label>Venue</Label>
                  <Input v-model="form.Venue" placeholder="The Grand Hall, Downtown..." />
                </div>
                <div class="space-y-1.5">
                  <Label>Number of Guests</Label>
                  <Input v-model="form.Guests" type="number" placeholder="100" />
                </div>
                <div class="space-y-1.5">
                  <Label>Setting</Label>
                  <Select v-model="form.Setting">
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Indoor">Indoor</SelectItem>
                      <SelectItem value="Outdoor">Outdoor</SelectItem>
                      <SelectItem value="Both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div class="space-y-1.5">
                  <Label>Service Style</Label>
                  <Select v-model="form.ServiceStyle">
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Plated">Plated</SelectItem>
                      <SelectItem value="Buffet">Buffet</SelectItem>
                      <SelectItem value="Stations">Stations</SelectItem>
                      <SelectItem value="Family Style">Family Style</SelectItem>
                      <SelectItem value="Cocktail">Cocktail</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div class="space-y-1.5">
                  <Label>Theme</Label>
                  <Input v-model="form.Theme" placeholder="Black & Gold, Garden Floral..." />
                </div>
                <div class="col-span-2 space-y-1.5">
                  <Label>Allergies / Dietary</Label>
                  <Input v-model="form.Allergies" placeholder="Nuts, Gluten, Dairy..." />
                </div>
                <div class="col-span-2 space-y-1.5">
                  <Label>Services Needed</Label>
                  <Input v-model="form.ServicesNeeded" placeholder="Catering, Bar, Waitstaff..." />
                </div>
                <div class="col-span-2 space-y-1.5">
                  <Label>Event Details</Label>
                  <Textarea v-model="form.EventDetails" rows="3" placeholder="Additional details about the event..." />
                </div>
                <div class="col-span-2 space-y-1.5">
                  <Label>Preferences</Label>
                  <Textarea v-model="form.Preferences" rows="2" placeholder="Dietary preferences, style notes..." />
                </div>
              </div>

              <!-- Tab: Budget & Logistics -->
              <div v-show="formTab === 'budget'" class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <Label>Budget</Label>
                  <Input v-model="form.Budget" placeholder="$10,000" />
                </div>
                <div class="space-y-1.5">
                  <Label>Need Setup?</Label>
                  <Select v-model="form.NeedSetup">
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div class="col-span-2 space-y-1.5">
                  <Label>Budget Additional Info</Label>
                  <Input v-model="form.BudgetAdditionalInfo" placeholder="Flexible for upgrades..." />
                </div>
                <div class="col-span-2 space-y-1.5">
                  <Label>Menu Recommendations</Label>
                  <Textarea v-model="form.MenuRecommendations" rows="4" placeholder="Mediterranean spread, custom cake..." />
                </div>
              </div>

              <!-- Tab: Others -->
              <div v-show="formTab === 'others'" class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <Label>How did they find us?</Label>
                  <Select v-model="form.HowDoYouKnow">
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Google Search">Google Search</SelectItem>
                      <SelectItem value="Instagram">Instagram</SelectItem>
                      <SelectItem value="Referral">Referral</SelectItem>
                      <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                      <SelectItem value="Friend Referral">Friend Referral</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div v-if="form.HowDoYouKnow === 'Other'" class="space-y-1.5">
                  <Label>Other — specify</Label>
                  <Input v-model="form.OtherHowToKnow" placeholder="How they found us..." />
                </div>
                <div class="space-y-1.5">
                  <Label>Status</Label>
                  <Select v-model="form.Status">
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="s in statusOptions" :key="s" :value="s">{{ s }}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div class="col-span-2 space-y-1.5">
                  <Label>Comments</Label>
                  <Textarea v-model="form.Comments" rows="5" placeholder="Any additional notes, special requests, or internal comments..." />
                </div>
              </div>

            </div>

            <!-- Footer pinned inside right panel -->
            <div class="shrink-0 border-t px-5 py-3 flex justify-end gap-2 bg-background">
              <Button variant="outline" type="button" @click="showDialog = false">Cancel</Button>
              <Button type="submit">{{ editingOrder ? 'Update Order' : 'Create Order' }}</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <!-- ── Delete Confirm ── -->
    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this order?</AlertDialogTitle>
          <AlertDialogDescription>This action cannot be undone. The order will be permanently removed.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="handleDelete">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
