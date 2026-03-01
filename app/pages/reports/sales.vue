<script setup lang="ts">
import NumberFlow from '@number-flow/vue'
import { TrendingUp, TrendingDown } from 'lucide-vue-next'

useHead({ title: 'Sales Reports — The Culture Gourmet' })

const { setHeader } = usePageHeader()
setHeader({ title: 'Sales Reports', description: 'Analytics based on your orders & customers', icon: 'i-lucide-trending-up' })

// ─── Types ────────────────────────────────────────────────────
interface Order {
  id: string
  OrderID: string
  Name: string
  Email: string
  Company: string
  TypeOfEvent: string
  OtherTypeOfEvent: string
  Date: string
  Venue: string
  Guests: string
  Budget: string
  Status: string
  TimeStamp: string
}

interface Customer {
  id: string
  name: string
  email: string
  company: string
  totalSpent: number
  orders: number
  status: string
  joinDate: string
}

// ─── Load data from localStorage ──────────────────────────────
const orders = ref<Order[]>([])
const customers = ref<Customer[]>([])
const loading = ref(true)

onMounted(() => {
  try {
    const rawOrders = localStorage.getItem('tcg-orders-v1')
    orders.value = rawOrders ? JSON.parse(rawOrders) : []
  }
  catch { orders.value = [] }

  try {
    const rawCustomers = localStorage.getItem('erp-sales-customers')
    customers.value = rawCustomers ? JSON.parse(rawCustomers) : []
  }
  catch { customers.value = [] }

  loading.value = false
})

// ─── Helpers ──────────────────────────────────────────────────
function parseBudget(budget: string): number {
  if (!budget) return 0
  const cleaned = budget.replace(/[^0-9.,]/g, '').replace(/,/g, '')
  return Number.parseFloat(cleaned) || 0
}

function fmt(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`
  return `$${n.toLocaleString()}`
}

function fmtFull(n: number) {
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function formatDate(d: string) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return d }
}

function initials(name: string) {
  return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??'
}

// ─── KPI computations ────────────────────────────────────────
const kpis = computed(() => {
  const total = orders.value.length
  const totalBudget = orders.value.reduce((sum, o) => sum + parseBudget(o.Budget), 0)
  const confirmed = orders.value.filter(o => o.Status === 'Confirmed').length
  const completed = orders.value.filter(o => o.Status === 'Completed').length
  const inProgress = orders.value.filter(o => o.Status === 'In Progress').length
  const newOrders = orders.value.filter(o => o.Status === 'New').length
  const cancelled = orders.value.filter(o => o.Status === 'Cancelled').length
  const totalGuests = orders.value.reduce((sum, o) => sum + (Number(o.Guests) || 0), 0)
  const avgBudget = total > 0 ? totalBudget / total : 0
  const activeCustomers = customers.value.filter(c => c.status === 'Active' || c.status === 'VIP').length

  return { total, totalBudget, confirmed, completed, inProgress, newOrders, cancelled, totalGuests, avgBudget, activeCustomers }
})

// ─── Order Status Distribution (Donut) ─────────────────────────
const statusDonutData = computed(() => {
  const counts: Record<string, number> = {}
  orders.value.forEach((o) => {
    counts[o.Status] = (counts[o.Status] || 0) + 1
  })
  return Object.entries(counts).map(([name, total]) => ({ name, total }))
})

const statusColors = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#06b6d4', '#ef4444']

// ─── Event Type Breakdown (Bar) ───────────────────────────────
const eventTypeData = computed(() => {
  const counts: Record<string, number> = {}
  orders.value.forEach((o) => {
    const type = o.TypeOfEvent || o.OtherTypeOfEvent || 'Unknown'
    counts[type] = (counts[type] || 0) + 1
  })
  return Object.entries(counts)
    .map(([type, count]) => ({ type, Orders: count }))
    .sort((a, b) => b.Orders - a.Orders)
})

// ─── Monthly Orders Trend (Area) ──────────────────────────────
const monthlyOrdersData = computed(() => {
  const months: Record<string, { orders: number, budget: number }> = {}
  orders.value.forEach((o) => {
    const d = o.Date || o.TimeStamp
    if (!d) return
    try {
      const date = new Date(d)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!months[key]) months[key] = { orders: 0, budget: 0 }
      months[key]!.orders++
      months[key]!.budget += parseBudget(o.Budget)
    }
    catch { /* ignore */ }
  })
  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => {
      const d = new Date(month + '-01')
      return {
        month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        Orders: data.orders,
        Budget: data.budget,
      }
    })
})

// ─── Budget by Event Type (Donut) ─────────────────────────────
const budgetByEventData = computed(() => {
  const map: Record<string, number> = {}
  orders.value.forEach((o) => {
    const type = o.TypeOfEvent || o.OtherTypeOfEvent || 'Unknown'
    map[type] = (map[type] || 0) + parseBudget(o.Budget)
  })
  return Object.entries(map)
    .filter(([, v]) => v > 0)
    .map(([name, total]) => ({ name, total: Math.round(total) }))
    .sort((a, b) => b.total - a.total)
})

// ─── Top Clients by Budget ────────────────────────────────────
const topClientsByBudget = computed(() => {
  const map: Record<string, { name: string, company: string, email: string, totalBudget: number, orderCount: number }> = {}
  orders.value.forEach((o) => {
    const key = o.Email || o.Name || 'unknown'
    if (!map[key]) map[key] = { name: o.Name, company: o.Company, email: o.Email, totalBudget: 0, orderCount: 0 }
    map[key]!.totalBudget += parseBudget(o.Budget)
    map[key]!.orderCount++
  })
  return Object.values(map)
    .filter(c => c.name)
    .sort((a, b) => b.totalBudget - a.totalBudget)
    .slice(0, 8)
})

// ─── Venue Distribution ──────────────────────────────────────
const venueData = computed(() => {
  const map: Record<string, number> = {}
  orders.value.forEach((o) => {
    if (o.Venue) map[o.Venue] = (map[o.Venue] || 0) + 1
  })
  return Object.entries(map)
    .map(([venue, count]) => ({ venue, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
})

// ─── Recent Orders ───────────────────────────────────────────
const recentOrders = computed(() => {
  return [...orders.value]
    .sort((a, b) => new Date(b.TimeStamp).getTime() - new Date(a.TimeStamp).getTime())
    .slice(0, 8)
})

// ─── Status styling ──────────────────────────────────────────
const statusStyles: Record<string, string> = {
  'New': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'In Review': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'Confirmed': 'bg-violet-500/10 text-violet-700 border-violet-500/20',
  'In Progress': 'bg-teal-500/10 text-teal-700 border-teal-500/20',
  'Completed': 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  'Cancelled': 'bg-red-500/10 text-red-600 border-red-500/20',
}

const avatarColors = [
  'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  'bg-pink-500/15 text-pink-600 dark:text-pink-400',
  'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
  'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
]

const activeTab = ref('overview')
</script>

<template>
  <div class="w-full flex flex-col gap-5">
    <!-- Loading -->
    <template v-if="loading">
      <div class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Card v-for="i in 6" :key="i">
          <CardContent class="p-4 space-y-2">
            <Skeleton class="h-5 w-5" />
            <Skeleton class="h-7 w-20" />
            <Skeleton class="h-3 w-16" />
          </CardContent>
        </Card>
      </div>
    </template>

    <template v-else>
      <!-- Tab Navigation -->
      <div class="flex items-center gap-1 border rounded-lg p-1 bg-muted/30 w-fit">
        <button
          v-for="tab in [
            { id: 'overview', label: 'Overview', icon: 'i-lucide-layout-dashboard' },
            { id: 'orders', label: 'Orders Analysis', icon: 'i-lucide-notebook-pen' },
            { id: 'clients', label: 'Clients', icon: 'i-lucide-users' },
          ]"
          :key="tab.id"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
          :class="activeTab === tab.id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'"
          @click="activeTab = tab.id"
        >
          <Icon :name="tab.icon" class="size-3.5" />
          {{ tab.label }}
        </button>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Card class="group relative overflow-hidden">
          <div class="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] to-transparent" />
          <CardContent class="p-4 space-y-2 relative z-10">
            <div class="flex items-center justify-between">
              <div class="flex items-center justify-center rounded-lg p-1.5 bg-emerald-500/10">
                <Icon name="i-lucide-dollar-sign" class="size-3.5 text-emerald-500" />
              </div>
            </div>
            <div>
              <p class="text-xl font-bold tabular-nums leading-tight">
                <NumberFlow :value="kpis.totalBudget" :format="{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }" />
              </p>
              <p class="text-[10px] text-muted-foreground mt-0.5">Total Pipeline Value</p>
            </div>
          </CardContent>
        </Card>

        <Card class="group relative overflow-hidden">
          <div class="absolute inset-0 bg-gradient-to-br from-blue-500/[0.03] to-transparent" />
          <CardContent class="p-4 space-y-2 relative z-10">
            <div class="flex items-center justify-between">
              <div class="flex items-center justify-center rounded-lg p-1.5 bg-blue-500/10">
                <Icon name="i-lucide-notebook-pen" class="size-3.5 text-blue-500" />
              </div>
            </div>
            <div>
              <p class="text-xl font-bold tabular-nums leading-tight">
                <NumberFlow :value="kpis.total" />
              </p>
              <p class="text-[10px] text-muted-foreground mt-0.5">Total Orders</p>
            </div>
          </CardContent>
        </Card>

        <Card class="group relative overflow-hidden">
          <div class="absolute inset-0 bg-gradient-to-br from-violet-500/[0.03] to-transparent" />
          <CardContent class="p-4 space-y-2 relative z-10">
            <div class="flex items-center justify-between">
              <div class="flex items-center justify-center rounded-lg p-1.5 bg-violet-500/10">
                <Icon name="i-lucide-bar-chart-3" class="size-3.5 text-violet-500" />
              </div>
            </div>
            <div>
              <p class="text-xl font-bold tabular-nums leading-tight">
                <NumberFlow :value="kpis.avgBudget" :format="{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }" />
              </p>
              <p class="text-[10px] text-muted-foreground mt-0.5">Avg. Order Value</p>
            </div>
          </CardContent>
        </Card>

        <Card class="group relative overflow-hidden">
          <div class="absolute inset-0 bg-gradient-to-br from-teal-500/[0.03] to-transparent" />
          <CardContent class="p-4 space-y-2 relative z-10">
            <div class="flex items-center justify-between">
              <div class="flex items-center justify-center rounded-lg p-1.5 bg-teal-500/10">
                <Icon name="i-lucide-check-circle-2" class="size-3.5 text-teal-500" />
              </div>
            </div>
            <div>
              <p class="text-xl font-bold tabular-nums leading-tight">
                <NumberFlow :value="kpis.confirmed + kpis.completed" />
              </p>
              <p class="text-[10px] text-muted-foreground mt-0.5">Confirmed & Done</p>
            </div>
          </CardContent>
        </Card>

        <Card class="group relative overflow-hidden">
          <div class="absolute inset-0 bg-gradient-to-br from-amber-500/[0.03] to-transparent" />
          <CardContent class="p-4 space-y-2 relative z-10">
            <div class="flex items-center justify-between">
              <div class="flex items-center justify-center rounded-lg p-1.5 bg-amber-500/10">
                <Icon name="i-lucide-users" class="size-3.5 text-amber-500" />
              </div>
            </div>
            <div>
              <p class="text-xl font-bold tabular-nums leading-tight">
                <NumberFlow :value="kpis.totalGuests" />
              </p>
              <p class="text-[10px] text-muted-foreground mt-0.5">Total Guests</p>
            </div>
          </CardContent>
        </Card>

        <Card class="group relative overflow-hidden">
          <div class="absolute inset-0 bg-gradient-to-br from-pink-500/[0.03] to-transparent" />
          <CardContent class="p-4 space-y-2 relative z-10">
            <div class="flex items-center justify-between">
              <div class="flex items-center justify-center rounded-lg p-1.5 bg-pink-500/10">
                <Icon name="i-lucide-user-check" class="size-3.5 text-pink-500" />
              </div>
            </div>
            <div>
              <p class="text-xl font-bold tabular-nums leading-tight">
                <NumberFlow :value="kpis.activeCustomers" />
              </p>
              <p class="text-[10px] text-muted-foreground mt-0.5">Active Customers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- ═══════ OVERVIEW TAB ═══════ -->
      <template v-if="activeTab === 'overview'">
        <!-- Row 1: Monthly Trend + Status Donut -->
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card class="lg:col-span-2">
            <CardHeader class="pb-2">
              <div class="flex items-center justify-between">
                <div>
                  <CardTitle class="text-sm font-semibold">Orders Trend</CardTitle>
                  <CardDescription>Monthly order volume</CardDescription>
                </div>
                <Badge variant="outline" class="text-xs">
                  {{ kpis.total }} total
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <AreaChart
                v-if="monthlyOrdersData.length"
                :data="monthlyOrdersData"
                index="month"
                :categories="['Orders']"
                :colors="['#6366f1']"
                class="h-[280px]"
                :show-legend="false"
              />
              <div v-else class="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                <div class="flex flex-col items-center gap-2">
                  <Icon name="i-lucide-bar-chart-3" class="size-8 text-muted-foreground/40" />
                  <p>No order data yet</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-sm font-semibold">Order Status</CardTitle>
              <CardDescription>Distribution by status</CardDescription>
            </CardHeader>
            <CardContent class="flex flex-col items-center">
              <DonutChart
                v-if="statusDonutData.length"
                :data="statusDonutData"
                index="name"
                category="total"
                :colors="statusColors"
                class="h-[180px]"
              />
              <div v-else class="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
                No data
              </div>
              <div v-if="statusDonutData.length" class="w-full mt-4 space-y-2">
                <div v-for="(s, i) in statusDonutData" :key="s.name" class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2">
                    <div class="size-2.5 rounded-full" :style="{ background: statusColors[i % statusColors.length] }" />
                    <span class="text-muted-foreground">{{ s.name }}</span>
                  </div>
                  <span class="font-semibold tabular-nums">{{ s.total }}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- Row 2: Event Types + Budget by Event -->
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-sm font-semibold">Orders by Event Type</CardTitle>
              <CardDescription>Number of orders per event category</CardDescription>
            </CardHeader>
            <CardContent>
              <BarChart
                v-if="eventTypeData.length"
                :data="eventTypeData"
                index="type"
                :categories="['Orders']"
                :colors="['#8b5cf6']"
                :rounded-corners="6"
                class="h-[280px]"
                :show-legend="false"
              />
              <div v-else class="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                No event data
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-sm font-semibold">Budget by Event Type</CardTitle>
              <CardDescription>Revenue allocation by event category</CardDescription>
            </CardHeader>
            <CardContent class="flex flex-col items-center">
              <DonutChart
                v-if="budgetByEventData.length"
                :data="budgetByEventData"
                index="name"
                category="total"
                :colors="['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#8b5cf6']"
                :value-formatter="(v: number) => fmt(v)"
                class="h-[200px]"
              />
              <div v-else class="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                No budget data
              </div>
              <div v-if="budgetByEventData.length" class="w-full mt-4 space-y-2">
                <div v-for="(b, i) in budgetByEventData.slice(0, 5)" :key="b.name" class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2">
                    <div class="size-2.5 rounded-full" :style="{ background: ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#06b6d4'][i % 5] }" />
                    <span class="text-muted-foreground truncate max-w-[140px]">{{ b.name }}</span>
                  </div>
                  <span class="font-semibold tabular-nums">{{ fmt(b.total) }}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- Row 3: Venue Distribution -->
        <Card v-if="venueData.length">
          <CardHeader class="pb-2">
            <CardTitle class="text-sm font-semibold">Popular Venues</CardTitle>
            <CardDescription>Most frequently booked venues</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="space-y-3">
              <div v-for="(v, i) in venueData" :key="v.venue" class="space-y-1.5">
                <div class="flex items-center justify-between text-sm">
                  <div class="flex items-center gap-2">
                    <div class="flex items-center justify-center size-6 rounded-full text-[10px] font-bold" :class="avatarColors[i % avatarColors.length]">
                      {{ i + 1 }}
                    </div>
                    <span class="font-medium truncate max-w-[300px]">{{ v.venue }}</span>
                  </div>
                  <span class="text-muted-foreground tabular-nums text-xs">{{ v.count }} {{ v.count === 1 ? 'event' : 'events' }}</span>
                </div>
                <div class="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    class="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-1000"
                    :style="{ width: `${(v.count / (venueData[0]?.count || 1)) * 100}%` }"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </template>

      <!-- ═══════ ORDERS ANALYSIS TAB ═══════ -->
      <template v-if="activeTab === 'orders'">
        <!-- Monthly Budget Trend -->
        <Card>
          <CardHeader class="pb-2">
            <div class="flex items-center justify-between">
              <div>
                <CardTitle class="text-sm font-semibold">Monthly Budget Trend</CardTitle>
                <CardDescription>Total order budgets by month</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <BarChart
              v-if="monthlyOrdersData.length"
              :data="monthlyOrdersData"
              index="month"
              :categories="['Budget']"
              :colors="['#10b981']"
              :rounded-corners="6"
              :y-formatter="(v: number | Date) => fmt(Number(v))"
              class="h-[300px]"
              :show-legend="false"
            />
            <div v-else class="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
              No data available
            </div>
          </CardContent>
        </Card>

        <!-- Recent Orders Table -->
        <Card>
          <CardHeader class="pb-2">
            <div class="flex items-center justify-between">
              <div>
                <CardTitle class="text-sm font-semibold">Recent Orders</CardTitle>
                <CardDescription>Latest orders from your pipeline</CardDescription>
              </div>
              <NuxtLink to="/sales/orders">
                <Button variant="outline" size="sm" class="h-7 text-xs gap-1">
                  View All
                  <Icon name="i-lucide-arrow-up-right" class="size-3" />
                </Button>
              </NuxtLink>
            </div>
          </CardHeader>
          <CardContent class="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Guests</TableHead>
                  <TableHead class="text-right">Budget</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="o in recentOrders" :key="o.id">
                  <TableCell>
                    <span class="font-mono text-xs font-semibold text-primary">{{ o.OrderID }}</span>
                  </TableCell>
                  <TableCell>
                    <div class="flex items-center gap-2">
                      <Avatar class="size-6 border shrink-0">
                        <AvatarFallback class="text-[9px]">{{ initials(o.Name) }}</AvatarFallback>
                      </Avatar>
                      <span class="text-sm font-medium truncate max-w-[120px]">{{ o.Name || '—' }}</span>
                    </div>
                  </TableCell>
                  <TableCell class="text-sm">
                    {{ o.TypeOfEvent || o.OtherTypeOfEvent || '—' }}
                  </TableCell>
                  <TableCell class="text-sm text-muted-foreground">
                    {{ formatDate(o.Date) }}
                  </TableCell>
                  <TableCell class="text-sm tabular-nums">
                    {{ o.Guests || '—' }}
                  </TableCell>
                  <TableCell class="text-right text-sm font-semibold tabular-nums">
                    {{ o.Budget || '—' }}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" :class="statusStyles[o.Status] || 'bg-gray-500/10 text-gray-600 border-gray-500/20'">
                      {{ o.Status }}
                    </Badge>
                  </TableCell>
                </TableRow>
                <TableRow v-if="recentOrders.length === 0">
                  <TableCell colspan="7" class="h-32 text-center">
                    <div class="flex flex-col items-center gap-2 text-muted-foreground">
                      <Icon name="i-lucide-inbox" class="size-8" />
                      <p>No orders yet</p>
                      <NuxtLink to="/sales/orders">
                        <Button size="sm" variant="outline">
                          <Icon name="i-lucide-plus" class="mr-1 size-4" />
                          Create Order
                        </Button>
                      </NuxtLink>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <!-- Order Status Cards -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card v-for="s in ['New', 'In Review', 'Confirmed', 'In Progress', 'Completed', 'Cancelled']" :key="s">
            <CardContent class="p-4 text-center space-y-1">
              <Badge variant="outline" :class="statusStyles[s]" class="text-[10px]">{{ s }}</Badge>
              <p class="text-2xl font-bold tabular-nums">{{ orders.filter(o => o.Status === s).length }}</p>
              <p class="text-[10px] text-muted-foreground">orders</p>
            </CardContent>
          </Card>
        </div>
      </template>

      <!-- ═══════ CLIENTS TAB ═══════ -->
      <template v-if="activeTab === 'clients'">
        <!-- Top Clients by Budget -->
        <Card>
          <CardHeader class="pb-2">
            <div class="flex items-center justify-between">
              <div>
                <CardTitle class="text-sm font-semibold">Top Clients by Order Value</CardTitle>
                <CardDescription>Clients ranked by total order budgets</CardDescription>
              </div>
              <Badge variant="secondary" class="text-xs">
                {{ topClientsByBudget.length }} clients
              </Badge>
            </div>
          </CardHeader>
          <CardContent class="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="w-12">Rank</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead class="text-right">Total Budget</TableHead>
                  <TableHead class="text-center">Orders</TableHead>
                  <TableHead class="text-right">Avg. per Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="(c, i) in topClientsByBudget" :key="c.email">
                  <TableCell>
                    <div class="flex items-center justify-center size-6 rounded-full text-[10px] font-bold" :class="i < 3 ? 'bg-amber-500/15 text-amber-600' : 'bg-muted text-muted-foreground'">
                      {{ i + 1 }}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div class="flex items-center gap-2.5">
                      <div class="flex items-center justify-center rounded-full size-8 text-xs font-bold" :class="avatarColors[i % avatarColors.length]">
                        {{ initials(c.name) }}
                      </div>
                      <div>
                        <p class="text-sm font-medium">{{ c.name }}</p>
                        <p class="text-[10px] text-muted-foreground">{{ c.email }}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell class="text-sm text-muted-foreground">
                    {{ c.company || '—' }}
                  </TableCell>
                  <TableCell class="text-right font-semibold tabular-nums">
                    {{ fmtFull(c.totalBudget) }}
                  </TableCell>
                  <TableCell class="text-center tabular-nums">
                    {{ c.orderCount }}
                  </TableCell>
                  <TableCell class="text-right tabular-nums text-sm text-muted-foreground">
                    {{ c.orderCount > 0 ? fmt(Math.round(c.totalBudget / c.orderCount)) : '—' }}
                  </TableCell>
                </TableRow>
                <TableRow v-if="topClientsByBudget.length === 0">
                  <TableCell colspan="6" class="h-32 text-center text-muted-foreground">
                    No client data available yet
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <!-- Customer Database Stats -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4" v-if="customers.length">
          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-sm font-semibold">Customer Database</CardTitle>
              <CardDescription>From your Customers module</CardDescription>
            </CardHeader>
            <CardContent>
              <div class="space-y-4">
                <div v-for="s in ['Active', 'VIP', 'Inactive']" :key="s" class="space-y-1.5">
                  <div class="flex items-center justify-between text-sm">
                    <span class="font-medium">{{ s }}</span>
                    <span class="text-muted-foreground tabular-nums">
                      {{ customers.filter(c => c.status === s).length }}
                      <span class="text-[10px]">({{ customers.length > 0 ? Math.round((customers.filter(c => c.status === s).length / customers.length) * 100) : 0 }}%)</span>
                    </span>
                  </div>
                  <div class="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-700"
                      :class="s === 'VIP' ? 'bg-amber-500' : s === 'Active' ? 'bg-emerald-500' : 'bg-gray-400'"
                      :style="{ width: `${customers.length > 0 ? (customers.filter(c => c.status === s).length / customers.length) * 100 : 0}%` }"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-sm font-semibold">Customer Lifetime Value</CardTitle>
              <CardDescription>Top customers by total spend</CardDescription>
            </CardHeader>
            <CardContent class="space-y-3">
              <div v-for="(c, i) in customers.sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5)" :key="c.id" class="flex items-center gap-3">
                <div class="flex items-center justify-center size-6 rounded-full text-[10px] font-bold" :class="avatarColors[i % avatarColors.length]">
                  {{ initials(c.name) }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-medium truncate">{{ c.name }}</p>
                  <div class="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      class="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
                      :style="{ width: `${Math.min((c.totalSpent / (customers[0]?.totalSpent || 1)) * 100, 100)}%` }"
                    />
                  </div>
                </div>
                <span class="text-xs font-semibold tabular-nums shrink-0">{{ fmt(c.totalSpent) }}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </template>

      <!-- Empty State -->
      <Card v-if="orders.length === 0 && !loading" class="border-dashed">
        <div class="p-10 flex flex-col items-center gap-4 text-center">
          <div class="flex items-center justify-center size-16 rounded-2xl bg-muted">
            <Icon name="i-lucide-trending-up" class="size-8 text-muted-foreground/40" />
          </div>
          <div class="space-y-1">
            <h3 class="font-semibold">No data to report</h3>
            <p class="text-sm text-muted-foreground max-w-md">
              Your sales reports will populate automatically as you create orders and add customers. Start by creating your first order.
            </p>
          </div>
          <NuxtLink to="/sales/orders">
            <Button class="gap-2">
              <Icon name="i-lucide-plus" class="size-4" />
              Create Your First Order
            </Button>
          </NuxtLink>
        </div>
      </Card>
    </template>
  </div>
</template>
