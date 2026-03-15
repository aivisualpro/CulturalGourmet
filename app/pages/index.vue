<script setup lang="ts">
import NumberFlow from '@number-flow/vue'
import {
  TrendingDown,
  TrendingUp,
  DollarSign,
  Layers,
  Truck,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  BarChart3,
} from 'lucide-vue-next'

const { setHeader } = usePageHeader()
setHeader({ title: 'Dashboard', icon: 'i-lucide-layout-dashboard', description: 'Overview of key metrics and performance' })

// ─── Global Data Store (prefetched, instant) ────────────────
const store = useDataStore()
const dashboard = store.dashboard
const loading = computed(() => !store.ready.value)

// ─── Animated KPI values (for NumberFlow) ───────────────────
const kpis = reactive({
  totalSpend: 0,
  thisMonthSpend: 0,
  todaySpend: 0,
  totalCategories: 0,
  totalVendors: 0,
  totalConsumptions: 0,
  monthlyTrend: 0,
})

// ─── Chart time range ───────────────────────────────────────
const chartRange = ref<'30d' | '12w'>('30d')

// Animate KPIs when data arrives (or is already available)
watch(dashboard, (data) => {
  if (!data?.kpis) return
  nextTick(() => {
    kpis.totalSpend = data.kpis.totalSpend
    kpis.thisMonthSpend = data.kpis.thisMonthSpend
    kpis.todaySpend = data.kpis.todaySpend
    kpis.totalCategories = data.kpis.totalCategories
    kpis.totalVendors = data.kpis.totalVendors
    kpis.totalConsumptions = data.kpis.totalConsumptions
    kpis.monthlyTrend = Math.round(data.kpis.monthlyTrend * 10) / 10
  })
}, { immediate: true })

// ─── Helpers ────────────────────────────────────────────────
function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)
}

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatFullDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Chart data: Daily Area ─────────────────────────────────
const dailyChartData = computed(() => {
  if (!dashboard.value?.dailyTrend) return []
  return dashboard.value.dailyTrend.map((d: any) => ({
    date: formatDate(d.date),
    Spend: d.amount,
  }))
})

// ─── Chart data: Weekly Bar ─────────────────────────────────
const weeklyChartData = computed(() => {
  if (!dashboard.value?.weeklyTrend) return []
  return dashboard.value.weeklyTrend.map((d: any) => ({
    week: `Wk ${formatDate(d.weekStart)}`,
    Spend: d.amount,
  }))
})

// ─── Chart data: Category Donut ─────────────────────────────
const donutChartData = computed(() => {
  if (!dashboard.value?.categoryBreakdown) return []
  return dashboard.value.categoryBreakdown.map((c: any) => ({
    name: c.name,
    total: Math.round(c.total * 100) / 100,
  }))
})

// ─── Chart data: Monthly stacked bar ────────────────────────
const monthlyChartData = computed(() => {
  if (!dashboard.value?.monthlyBreakdown) return []
  return dashboard.value.monthlyBreakdown.map((row: any) => {
    const d = new Date(row.month + '-01')
    return {
      ...row,
      month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    }
  })
})

const monthlyCategories = computed(() => dashboard.value?.allCatNames || [])

// Color palette for charts
const chartColors = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6']

// Color map for category badges
const colorMap: Record<string, { bg: string, text: string, border: string }> = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' },
  sky: { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-500/20' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-500/20' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500/20' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20' },
  pink: { bg: 'bg-pink-500/10', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-500/20' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/20' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-500/20' },
  teal: { bg: 'bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-500/20' },
}

const defaultCMap = { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20' }

function getCMap(colorName: string) {
  return colorMap[colorName] ?? defaultCMap
}
</script>

<template>
  <div class="w-full flex flex-col gap-5">
    <!-- Loading skeleton -->
    <template v-if="loading">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card v-for="i in 4" :key="i" class="p-5">
          <Skeleton class="h-4 w-24 mb-3" />
          <Skeleton class="h-8 w-32 mb-2" />
          <Skeleton class="h-3 w-20" />
        </Card>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card class="lg:col-span-2 p-5">
          <Skeleton class="h-[300px] w-full" />
        </Card>
        <Card class="p-5">
          <Skeleton class="h-[300px] w-full" />
        </Card>
      </div>
    </template>

    <!-- Dashboard Content -->
    <template v-else-if="dashboard">
      <!-- ═══════ KPI Cards ═══════ -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <!-- Total Spend -->
        <Card class="@container/card relative overflow-hidden group">
          <div class="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] to-transparent" />
          <CardHeader class="pb-2">
            <div class="flex items-center justify-between">
              <CardDescription class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Spend</CardDescription>
              <div class="rounded-lg bg-emerald-500/10 p-2 transition-colors group-hover:bg-emerald-500/20">
                <DollarSign class="size-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <CardTitle class="text-2xl font-bold tabular-nums @[250px]/card:text-3xl">
              <NumberFlow
                :value="kpis.totalSpend"
                :format="{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }"
              />
            </CardTitle>
          </CardHeader>
          <CardFooter class="pt-0 flex-col items-start gap-1 text-sm">
            <div class="flex items-center gap-1.5">
              <Badge variant="outline" class="text-[10px] px-1.5" :class="kpis.monthlyTrend >= 0 ? 'text-rose-600 border-rose-200 dark:text-rose-400 dark:border-rose-800' : 'text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800'">
                <component :is="kpis.monthlyTrend >= 0 ? ArrowUpRight : ArrowDownRight" class="size-3 mr-0.5" />
                {{ Math.abs(kpis.monthlyTrend) }}%
              </Badge>
              <span class="text-xs text-muted-foreground">vs last month</span>
            </div>
          </CardFooter>
        </Card>

        <!-- This Month -->
        <Card class="@container/card relative overflow-hidden group">
          <div class="absolute inset-0 bg-gradient-to-br from-violet-500/[0.03] to-transparent" />
          <CardHeader class="pb-2">
            <div class="flex items-center justify-between">
              <CardDescription class="text-xs font-medium uppercase tracking-wider text-muted-foreground">This Month</CardDescription>
              <div class="rounded-lg bg-violet-500/10 p-2 transition-colors group-hover:bg-violet-500/20">
                <CalendarDays class="size-4 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
            <CardTitle class="text-2xl font-bold tabular-nums @[250px]/card:text-3xl">
              <NumberFlow
                :value="kpis.thisMonthSpend"
                :format="{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }"
              />
            </CardTitle>
          </CardHeader>
          <CardFooter class="pt-0 flex-col items-start gap-1 text-sm">
            <div class="flex items-center gap-1.5">
              <CalendarDays class="size-3 text-muted-foreground" />
              <span class="text-xs text-muted-foreground">
                Today: <span class="font-semibold text-foreground">{{ formatCurrency(kpis.todaySpend) }}</span>
              </span>
            </div>
          </CardFooter>
        </Card>

        <!-- Categories -->
        <Card class="@container/card relative overflow-hidden group">
          <div class="absolute inset-0 bg-gradient-to-br from-amber-500/[0.03] to-transparent" />
          <CardHeader class="pb-2">
            <div class="flex items-center justify-between">
              <CardDescription class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Categories</CardDescription>
              <div class="rounded-lg bg-amber-500/10 p-2 transition-colors group-hover:bg-amber-500/20">
                <Layers class="size-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <CardTitle class="text-2xl font-bold tabular-nums @[250px]/card:text-3xl">
              <NumberFlow :value="kpis.totalCategories" />
            </CardTitle>
          </CardHeader>
          <CardFooter class="pt-0 flex-col items-start gap-1 text-sm">
            <div class="flex items-center gap-1.5">
              <div class="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span class="text-xs text-muted-foreground">
                <span class="font-semibold text-foreground">{{ dashboard.kpis.activeCategories }}</span> active
              </span>
            </div>
          </CardFooter>
        </Card>

        <!-- Vendors -->
        <Card class="@container/card relative overflow-hidden group">
          <div class="absolute inset-0 bg-gradient-to-br from-sky-500/[0.03] to-transparent" />
          <CardHeader class="pb-2">
            <div class="flex items-center justify-between">
              <CardDescription class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Vendors</CardDescription>
              <div class="rounded-lg bg-sky-500/10 p-2 transition-colors group-hover:bg-sky-500/20">
                <Truck class="size-4 text-sky-600 dark:text-sky-400" />
              </div>
            </div>
            <CardTitle class="text-2xl font-bold tabular-nums @[250px]/card:text-3xl">
              <NumberFlow :value="kpis.totalVendors" />
            </CardTitle>
          </CardHeader>
          <CardFooter class="pt-0 flex-col items-start gap-1 text-sm">
            <div class="flex items-center gap-1.5">
              <span class="text-xs text-muted-foreground">
                <span class="font-semibold text-foreground">{{ dashboard.kpis.totalContacts }}</span> contacts
              </span>
            </div>
          </CardFooter>
        </Card>
      </div>

      <!-- ═══════ Charts Row 1: Spend Trend + Category Donut ═══════ -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- Spend trend chart -->
        <Card class="lg:col-span-2">
          <CardHeader>
            <div class="flex items-center justify-between">
              <div>
                <CardTitle class="text-base">Spending Trend</CardTitle>
                <CardDescription class="text-xs">
                  {{ chartRange === '30d' ? 'Daily spend over the last 30 days' : 'Weekly spend over the last 12 weeks' }}
                </CardDescription>
              </div>
              <div class="flex items-center rounded-lg bg-muted p-0.5 gap-0.5">
                <button
                  class="px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-200"
                  :class="chartRange === '30d' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                  @click="chartRange = '30d'"
                >
                  Daily
                </button>
                <button
                  class="px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-200"
                  :class="chartRange === '12w' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                  @click="chartRange = '12w'"
                >
                  Weekly
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <AreaChart
              v-if="chartRange === '30d' && dailyChartData.length"
              :data="dailyChartData"
              :categories="['Spend']"
              index="date"
              :colors="['#10b981']"
              :y-formatter="(v: number | Date) => formatCurrency(Number(v))"
              class="h-[300px]"
              :show-legend="false"
            />
            <BarChart
              v-else-if="chartRange === '12w' && weeklyChartData.length"
              :data="weeklyChartData"
              :categories="['Spend']"
              index="week"
              :colors="['#6366f1']"
              :y-formatter="(v: number | Date) => formatCurrency(Number(v))"
              :rounded-corners="4"
              class="h-[300px]"
              :show-legend="false"
            />
            <div v-else class="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
              <div class="flex flex-col items-center gap-2">
                <BarChart3 class="size-8 text-muted-foreground/40" />
                <p>No consumption data available</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Category donut -->
        <Card>
          <CardHeader>
            <CardTitle class="text-base">Spend by Category</CardTitle>
            <CardDescription class="text-xs">All-time breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart
              v-if="donutChartData.length"
              :data="donutChartData"
              category="total"
              index="name"
              :colors="chartColors"
              :value-formatter="(v: number) => formatCurrency(v)"
              class="h-[240px]"
            />
            <div v-else class="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
              No data
            </div>
            <!-- Category list -->
            <div v-if="donutChartData.length" class="mt-4 space-y-2">
              <div
                v-for="(cat, i) in donutChartData.slice(0, 5)"
                :key="cat.name"
                class="flex items-center justify-between text-sm"
              >
                <div class="flex items-center gap-2">
                  <div class="size-2.5 rounded-full" :style="{ backgroundColor: chartColors[Number(i) % chartColors.length] }" />
                  <span class="text-xs truncate max-w-[120px]">{{ cat.name }}</span>
                </div>
                <span class="text-xs font-semibold tabular-nums">{{ formatCurrency(cat.total) }}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- ═══════ Charts Row 2: Monthly Breakdown + Top Sub-categories ═══════ -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- Monthly stacked bar -->
        <Card class="lg:col-span-2">
          <CardHeader>
            <CardTitle class="text-base">Monthly Breakdown</CardTitle>
            <CardDescription class="text-xs">Category spend over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart
              v-if="monthlyChartData.length && monthlyCategories.length"
              :data="monthlyChartData"
              :categories="monthlyCategories"
              index="month"
              type="stacked"
              :colors="chartColors"
              :y-formatter="(v: number | Date) => formatCurrency(Number(v))"
              :rounded-corners="2"
              class="h-[300px]"
            />
            <div v-else class="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
              No monthly data available
            </div>
          </CardContent>
        </Card>

        <!-- Top sub-categories + Recent -->
        <div class="flex flex-col gap-4">
          <!-- Top Sub-categories -->
          <Card>
            <CardHeader class="pb-3">
              <CardTitle class="text-base">Top Sub-categories</CardTitle>
              <CardDescription class="text-xs">Highest spend items</CardDescription>
            </CardHeader>
            <CardContent class="space-y-3">
              <template v-if="dashboard.topSubCategories?.length">
                <div
                  v-for="(item, i) in dashboard.topSubCategories"
                  :key="item.name"
                  class="flex items-center gap-3"
                >
                  <div class="flex items-center justify-center size-6 rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                    {{ Number(i) + 1 }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-medium truncate">{{ item.name }}</p>
                    <div class="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        class="h-full rounded-full transition-all duration-500"
                        :style="{
                          width: `${Math.min((Number(item.total) / (Number(dashboard.topSubCategories[0]?.total) || 1)) * 100, 100)}%`,
                          backgroundColor: chartColors[Number(i) % chartColors.length],
                        }"
                      />
                    </div>
                  </div>
                  <span class="text-xs font-semibold tabular-nums shrink-0">{{ formatCurrency(item.total) }}</span>
                </div>
              </template>
              <div v-else class="py-6 text-center text-sm text-muted-foreground">
                No data yet
              </div>
            </CardContent>
          </Card>

          <!-- Quick stats -->
          <Card>
            <CardHeader class="pb-3">
              <CardTitle class="text-base">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="grid grid-cols-2 gap-3">
                <div class="flex flex-col items-center p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <Flame class="size-5 text-emerald-600 dark:text-emerald-400 mb-1" />
                  <span class="text-lg font-bold tabular-nums">{{ Number(kpis.totalConsumptions) }}</span>
                  <span class="text-[10px] text-muted-foreground uppercase tracking-wider">Entries</span>
                </div>
                <div class="flex flex-col items-center p-3 rounded-xl bg-violet-500/5 border border-violet-500/10">
                  <DollarSign class="size-5 text-violet-600 dark:text-violet-400 mb-1" />
                  <span class="text-lg font-bold tabular-nums">{{ formatCurrency(Number(kpis.totalSpend) / Math.max(Number(kpis.totalConsumptions), 1)) }}</span>
                  <span class="text-[10px] text-muted-foreground uppercase tracking-wider">Avg / Entry</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <!-- ═══════ Recent Activity ═══════ -->
      <Card>
        <CardHeader>
          <div class="flex items-center justify-between">
            <div>
              <CardTitle class="text-base">Recent Activity</CardTitle>
              <CardDescription class="text-xs">Latest 10 consumption entries</CardDescription>
            </div>
            <NuxtLink to="/inventory/consumptions">
              <Button variant="outline" size="sm" class="h-7 text-xs gap-1">
                View All
                <ArrowUpRight class="size-3" />
              </Button>
            </NuxtLink>
          </div>
        </CardHeader>
        <CardContent class="p-0">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b bg-muted/30">
                  <th class="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                  <th class="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</th>
                  <th class="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Sub-category</th>
                  <th class="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                  <th class="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Remarks</th>
                </tr>
              </thead>
              <tbody>
                <template v-if="dashboard.recentConsumptions?.length">
                  <tr
                    v-for="entry in dashboard.recentConsumptions"
                    :key="entry._id"
                    class="border-b border-border/40 hover:bg-muted/20 transition-colors"
                  >
                    <td class="px-4 py-2.5 text-xs text-muted-foreground">
                      {{ formatFullDate(entry.date) }}
                    </td>
                    <td class="px-4 py-2.5">
                      <Badge
                        variant="outline"
                        class="text-[10px] font-medium px-2 py-0.5"
                        :class="[
                          getCMap(dashboard.categoryBreakdown.find((c: any) => c.name === entry.category)?.color || 'blue').bg,
                          getCMap(dashboard.categoryBreakdown.find((c: any) => c.name === entry.category)?.color || 'blue').text,
                          getCMap(dashboard.categoryBreakdown.find((c: any) => c.name === entry.category)?.color || 'blue').border,
                        ]"
                      >
                        {{ entry.category }}
                      </Badge>
                    </td>
                    <td class="px-4 py-2.5 text-xs hidden sm:table-cell">{{ entry.subCategory }}</td>
                    <td class="px-4 py-2.5 text-right font-semibold tabular-nums text-sm">{{ formatCurrency(entry.amount) }}</td>
                    <td class="px-4 py-2.5 text-xs text-muted-foreground hidden md:table-cell max-w-[200px] truncate">{{ entry.remarks || '—' }}</td>
                  </tr>
                </template>
                <tr v-else>
                  <td colspan="5" class="px-4 py-8 text-center text-muted-foreground text-sm">
                    No recent entries
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
