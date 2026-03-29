<script setup lang="ts">
import { toast } from 'vue-sonner'
import { HEADER_ACTIONS_ID } from '~/composables/usePageHeader'
import { getUnitAbbr } from '~/constants/units'

const route = useRoute()
const locationId = route.params.id as string

const { setHeader } = usePageHeader()
setHeader({ title: 'Location Inventory', icon: 'i-lucide-map-pin' })

const location = ref<any>(null)
const inventory = ref<any[]>([])
const loading = ref(true)
const search = ref('')

const _fetch = $fetch as typeof $fetch<any, any>

async function fetchData() {
  loading.value = true
  try {
    const data = await _fetch(`/api/locations/${locationId}/inventory`)
    location.value = data.location
    inventory.value = data.inventory

    if (location.value) {
      setHeader({ title: location.value.name, icon: 'i-lucide-map-pin' })
    }
  } catch (err) {
    toast.error('Failed to load location inventory')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})

const filteredInventory = computed(() => {
  if (!search.value) return inventory.value
  const q = search.value.toLowerCase()
  return inventory.value.filter(i => 
    i.item?.toLowerCase().includes(q) || 
    i.itemSKU?.toLowerCase().includes(q) ||
    i.category?.toLowerCase().includes(q)
  )
})
</script>

<template>
  <ClientOnly>
    <Teleport :to="`#${HEADER_ACTIONS_ID}`" defer>
      <div class="flex items-center gap-2 flex-wrap">
        <div class="relative hidden sm:block">
          <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input v-model="search" placeholder="Search inventory..." class="pl-8 h-8 w-48 text-xs" />
        </div>
        <Separator orientation="vertical" class="h-5 hidden sm:block" />
        <Button variant="ghost" size="sm" class="h-8 text-xs" @click="navigateTo('/inventory/locations')">
          <Icon name="i-lucide-arrow-left" class="mr-1 size-3.5" />Back to Locations
        </Button>
        <Separator orientation="vertical" class="h-5" />
        <Button variant="ghost" size="sm" class="h-8 text-xs" @click="fetchData">
          <Icon name="i-lucide-rotate-ccw" class="mr-1 size-3.5" />Refresh
        </Button>
      </div>
    </Teleport>
  </ClientOnly>

  <div class="w-full flex flex-col gap-5">
    <!-- Header Summary -->
    <Card v-if="location" class="p-6 bg-muted/20 border-border/50">
      <div class="flex items-start gap-4">
        <div class="size-12 rounded-xl border bg-primary/10 flex items-center justify-center shrink-0 shadow-sm">
          <Icon name="i-lucide-map-pin" class="size-6 text-primary" />
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="text-lg font-semibold truncate">{{ location.name }}</h2>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-muted-foreground">
            <span v-if="location.address" class="flex items-center gap-1.5"><Icon name="i-lucide-map" class="size-3.5" />{{ location.address }}</span>
            <span v-if="location.phone" class="flex items-center gap-1.5"><Icon name="i-lucide-phone" class="size-3.5" />{{ location.phone }}</span>
            <span v-if="location.notes" class="flex items-center gap-1.5 line-clamp-1"><Icon name="i-lucide-align-left" class="size-3.5" />{{ location.notes }}</span>
          </div>
        </div>
        <div class="shrink-0 text-right space-y-1">
          <p class="text-2xl font-bold tracking-tight tabular-nums">{{ inventory.length }}</p>
          <p class="text-xs text-muted-foreground font-medium uppercase tracking-wider">Unique Items</p>
        </div>
      </div>
    </Card>

    <div class="sm:hidden relative">
      <Icon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input v-model="search" placeholder="Search inventory..." class="pl-9 h-10 w-full" />
    </div>

    <!-- Inventory Table -->
    <Card v-if="loading" class="p-6">
      <div class="space-y-4">
        <Skeleton class="h-10 w-full" />
        <Skeleton class="h-10 w-full" />
        <Skeleton class="h-10 w-full" />
        <Skeleton class="h-10 w-3/4" />
      </div>
    </Card>

    <Card v-else-if="filteredInventory.length > 0">
      <div class="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-[120px]">SKU</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead class="text-right whitespace-nowrap">Purchased</TableHead>
              <TableHead class="text-right whitespace-nowrap">Consumed</TableHead>
              <TableHead class="text-right whitespace-nowrap">Transfers (Net)</TableHead>
              <TableHead class="text-center w-[80px]">UOM</TableHead>
              <TableHead class="text-right whitespace-nowrap bg-emerald-50/50 dark:bg-emerald-950/20">
                <span class="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <Icon name="i-lucide-package-check" class="size-4" />Available Balance
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow 
              v-for="i in filteredInventory" 
              :key="i._id" 
              class="group hover:bg-muted/40 transition-colors cursor-pointer"
              @click="navigateTo(`/inventory/items/${i._id}`)"
            >
              <TableCell class="font-mono text-xs text-muted-foreground">{{ i.itemSKU || '—' }}</TableCell>
              <TableCell class="font-medium">
                <div class="flex items-center gap-2">
                  <span class="truncate">{{ i.item }}</span>
                </div>
              </TableCell>
              <TableCell>
                <span v-if="i.category" class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary/10 text-primary">{{ i.category }}</span>
                <span v-else class="text-muted-foreground text-xs">—</span>
              </TableCell>
              <TableCell class="text-right tabular-nums text-muted-foreground">
                {{ i.poQty > 0 ? `+${i.poQty}` : '—' }}
              </TableCell>
              <TableCell class="text-right tabular-nums text-muted-foreground">
                {{ i.prepQty > 0 ? `-${i.prepQty}` : '—' }}
              </TableCell>
              <TableCell class="text-right tabular-nums text-muted-foreground">
                <span v-if="i.tInQty - i.tOutQty > 0" class="text-blue-600 dark:text-blue-400 font-medium">
                  +{{ i.tInQty - i.tOutQty }}
                </span>
                <span v-else-if="i.tInQty - i.tOutQty < 0" class="text-rose-600 dark:text-rose-400 font-medium">
                  {{ i.tInQty - i.tOutQty }}
                </span>
                <span v-else>—</span>
              </TableCell>
              <TableCell class="text-center">
                <span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {{ getUnitAbbr(i.unit) || i.unit || '—' }}
                </span>
              </TableCell>
              <TableCell class="text-right tabular-nums font-bold text-[15px] bg-emerald-50/30 dark:bg-emerald-950/10">
                <span :class="i.balance > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'">
                  {{ i.balance }}
                </span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </Card>

    <Card v-else class="p-12 border-dashed">
      <div class="flex flex-col items-center gap-4 text-center">
        <div class="size-16 rounded-2xl bg-muted/60 flex items-center justify-center">
          <Icon name="i-lucide-boxes" class="size-8 text-muted-foreground" />
        </div>
        <div>
          <h3 class="text-lg font-semibold">No {{ search ? 'matching' : 'available' }} items found</h3>
          <p class="text-sm text-muted-foreground mt-1 max-w-sm">
            {{ search ? `No items in inventory matched your search for "${search}".` : 'This location currently has no inventory balance greater than zero.' }}
          </p>
        </div>
        <div class="flex gap-2 mt-2">
          <Button v-if="search" variant="outline" @click="search = ''">
            <Icon name="i-lucide-x" class="mr-1.5 size-4" />Clear Search
          </Button>
          <Button v-else variant="default" @click="navigateTo('/inventory/transfers')">
            <Icon name="i-lucide-arrow-left-right" class="mr-1.5 size-4" />Transfer Items Here
          </Button>
        </div>
      </div>
    </Card>
  </div>
</template>
