<script setup lang="ts">
import { toast } from 'vue-sonner'
import { HEADER_ACTIONS_ID } from '~/composables/usePageHeader'

const { setHeader } = usePageHeader()
setHeader({ title: 'Categories', icon: 'i-lucide-tags' })

// ─── Global Data Store ──────────────────────────────────────
const { categories, ready: storeReady, fetchCategories } = useDataStore()
const loading = computed(() => !storeReady.value)
const search = ref('')
const saving = ref(false)

// Category dialog
const showCatDialog = ref(false)
const editingCat = ref<any>(null)
const catForm = ref({ name: '', icon: '', color: '', description: '' })

// Sub-category dialog
const showSubDialog = ref(false)
const activeCat = ref<any>(null)
const subForm = ref({ name: '' })
const editingSubIdx = ref<number | null>(null)

// Delete dialog
const showDeleteDialog = ref(false)
const deletingCat = ref<any>(null)
const iconSearch = ref('')

// Curated icon options for categories
const iconOptions = [
  { name: 'i-lucide-utensils', label: 'Utensils' },
  { name: 'i-lucide-utensils-crossed', label: 'Utensils Crossed' },
  { name: 'i-lucide-chef-hat', label: 'Chef Hat' },
  { name: 'i-lucide-cooking-pot', label: 'Cooking Pot' },
  { name: 'i-lucide-beef', label: 'Beef' },
  { name: 'i-lucide-egg', label: 'Egg' },
  { name: 'i-lucide-fish', label: 'Fish' },
  { name: 'i-lucide-apple', label: 'Apple' },
  { name: 'i-lucide-cherry', label: 'Cherry' },
  { name: 'i-lucide-citrus', label: 'Citrus' },
  { name: 'i-lucide-grape', label: 'Grape' },
  { name: 'i-lucide-banana', label: 'Banana' },
  { name: 'i-lucide-salad', label: 'Salad' },
  { name: 'i-lucide-sandwich', label: 'Sandwich' },
  { name: 'i-lucide-pizza', label: 'Pizza' },
  { name: 'i-lucide-popcorn', label: 'Popcorn' },
  { name: 'i-lucide-cake', label: 'Cake' },
  { name: 'i-lucide-cake-slice', label: 'Cake Slice' },
  { name: 'i-lucide-cookie', label: 'Cookie' },
  { name: 'i-lucide-candy', label: 'Candy' },
  { name: 'i-lucide-ice-cream-cone', label: 'Ice Cream' },
  { name: 'i-lucide-cup-soda', label: 'Cup Soda' },
  { name: 'i-lucide-coffee', label: 'Coffee' },
  { name: 'i-lucide-wine', label: 'Wine' },
  { name: 'i-lucide-beer', label: 'Beer' },
  { name: 'i-lucide-milk', label: 'Milk' },
  { name: 'i-lucide-glass-water', label: 'Water' },
  { name: 'i-lucide-wheat', label: 'Wheat' },
  { name: 'i-lucide-leaf', label: 'Leaf' },
  { name: 'i-lucide-vegan', label: 'Vegan' },
  { name: 'i-lucide-nut', label: 'Nut' },
  { name: 'i-lucide-flame', label: 'Flame' },
  { name: 'i-lucide-snowflake', label: 'Snowflake' },
  { name: 'i-lucide-thermometer', label: 'Thermometer' },
  { name: 'i-lucide-refrigerator', label: 'Refrigerator' },
  { name: 'i-lucide-microwave', label: 'Microwave' },
  { name: 'i-lucide-shopping-cart', label: 'Shopping Cart' },
  { name: 'i-lucide-shopping-basket', label: 'Shopping Basket' },
  { name: 'i-lucide-store', label: 'Store' },
  { name: 'i-lucide-warehouse', label: 'Warehouse' },
  { name: 'i-lucide-truck', label: 'Truck' },
  { name: 'i-lucide-package', label: 'Package' },
  { name: 'i-lucide-box', label: 'Box' },
  { name: 'i-lucide-archive', label: 'Archive' },
  { name: 'i-lucide-clipboard-list', label: 'Clipboard' },
  { name: 'i-lucide-receipt', label: 'Receipt' },
  { name: 'i-lucide-dollar-sign', label: 'Dollar' },
  { name: 'i-lucide-tag', label: 'Tag' },
  { name: 'i-lucide-tags', label: 'Tags' },
  { name: 'i-lucide-heart', label: 'Heart' },
  { name: 'i-lucide-star', label: 'Star' },
  { name: 'i-lucide-crown', label: 'Crown' },
  { name: 'i-lucide-sparkles', label: 'Sparkles' },
  { name: 'i-lucide-zap', label: 'Zap' },
  { name: 'i-lucide-shield', label: 'Shield' },
  { name: 'i-lucide-award', label: 'Award' },
  { name: 'i-lucide-gift', label: 'Gift' },
  { name: 'i-lucide-map-pin', label: 'Map Pin' },
  { name: 'i-lucide-clock', label: 'Clock' },
  { name: 'i-lucide-calendar', label: 'Calendar' },
  { name: 'i-lucide-sun', label: 'Sun' },
  { name: 'i-lucide-moon', label: 'Moon' },
  { name: 'i-lucide-droplets', label: 'Droplets' },
  { name: 'i-lucide-test-tube', label: 'Test Tube' },
  { name: 'i-lucide-flask-round', label: 'Flask' },
  { name: 'i-lucide-folder', label: 'Folder' },
  { name: 'i-lucide-layers', label: 'Layers' },
]

const filteredIcons = computed(() => {
  if (!iconSearch.value) return iconOptions
  const q = iconSearch.value.toLowerCase()
  return iconOptions.filter(i => i.label.toLowerCase().includes(q) || i.name.toLowerCase().includes(q))
})

// Color options for category cards
const colorOptions = [
  { value: 'emerald', label: 'Emerald', class: 'bg-emerald-500' },
  { value: 'sky', label: 'Sky', class: 'bg-sky-500' },
  { value: 'violet', label: 'Violet', class: 'bg-violet-500' },
  { value: 'amber', label: 'Amber', class: 'bg-amber-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
  { value: 'rose', label: 'Rose', class: 'bg-rose-500' },
  { value: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
  { value: 'teal', label: 'Teal', class: 'bg-teal-500' },
]

// Dynamic color mapping
const colorMap: Record<string, { bg: string, text: string, border: string, ring: string, soft: string }> = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20', ring: 'ring-emerald-500/30', soft: 'bg-emerald-50 dark:bg-emerald-500/5' },
  sky: { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-500/20', ring: 'ring-sky-500/30', soft: 'bg-sky-50 dark:bg-sky-500/5' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-500/20', ring: 'ring-violet-500/30', soft: 'bg-violet-50 dark:bg-violet-500/5' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20', ring: 'ring-amber-500/30', soft: 'bg-amber-50 dark:bg-amber-500/5' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500/20', ring: 'ring-orange-500/30', soft: 'bg-orange-50 dark:bg-orange-500/5' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20', ring: 'ring-blue-500/30', soft: 'bg-blue-50 dark:bg-blue-500/5' },
  pink: { bg: 'bg-pink-500/10', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-500/20', ring: 'ring-pink-500/30', soft: 'bg-pink-50 dark:bg-pink-500/5' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/20', ring: 'ring-rose-500/30', soft: 'bg-rose-50 dark:bg-rose-500/5' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-500/20', ring: 'ring-cyan-500/30', soft: 'bg-cyan-50 dark:bg-cyan-500/5' },
  teal: { bg: 'bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-500/20', ring: 'ring-teal-500/30', soft: 'bg-teal-50 dark:bg-teal-500/5' },
}

const defaultColor = { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20', ring: 'ring-blue-500/30', soft: 'bg-blue-50 dark:bg-blue-500/5' }

function getColor(color?: string) {
  return colorMap[color ?? ''] ?? defaultColor
}



// ─── Computed ───────────────────────────────────────────────
const filteredCategories = computed(() => {
  if (!search.value) return categories.value
  const q = search.value.toLowerCase()
  return categories.value.filter((c: any) =>
    c.name?.toLowerCase().includes(q)
    || c.description?.toLowerCase().includes(q)
    || c.subCategories?.some((s: any) => s.name?.toLowerCase().includes(q)),
  )
})

const totalSubs = computed(() =>
  categories.value.reduce((sum: number, c: any) => sum + (c.subCategories?.length || 0), 0),
)

// ─── Category CRUD ──────────────────────────────────────────
function openCreateCat() {
  editingCat.value = null
  catForm.value = { name: '', icon: '', color: 'blue', description: '' }
  showCatDialog.value = true
}

function openEditCat(cat: any) {
  editingCat.value = cat
  catForm.value = { name: cat.name, icon: cat.icon || '', color: cat.color || 'blue', description: cat.description || '' }
  showCatDialog.value = true
}

async function saveCat() {
  if (!catForm.value.name.trim()) {
    toast.error('Category name is required')
    return
  }
  saving.value = true
  try {
    if (editingCat.value) {
      await $fetch(`/api/categories/${editingCat.value._id}`, { method: 'PUT', body: catForm.value })
      toast.success('Category updated')
    }
    else {
      await $fetch('/api/categories', { method: 'POST', body: catForm.value })
      toast.success('Category created')
    }
    showCatDialog.value = false
    await fetchCategories()
  }
  catch {
    toast.error('Failed to save category')
  }
  finally {
    saving.value = false
  }
}

function confirmDeleteCat(cat: any) {
  deletingCat.value = cat
  showDeleteDialog.value = true
}

async function handleDeleteCat() {
  if (!deletingCat.value) return
  try {
    await $fetch(`/api/categories/${deletingCat.value._id}`, { method: 'DELETE' })
    toast.success('Category deleted')
    showDeleteDialog.value = false
    deletingCat.value = null
    await fetchCategories()
  }
  catch {
    toast.error('Failed to delete category')
  }
}

// ─── Sub-category CRUD ──────────────────────────────────────
function openAddSub(cat: any) {
  activeCat.value = cat
  editingSubIdx.value = null
  subForm.value = { name: '' }
  showSubDialog.value = true
}

function openEditSub(cat: any, idx: number) {
  activeCat.value = cat
  editingSubIdx.value = idx
  subForm.value = { name: cat.subCategories[idx].name }
  showSubDialog.value = true
}

async function saveSub() {
  if (!subForm.value.name.trim()) {
    toast.error('Sub-category name is required')
    return
  }
  saving.value = true
  try {
    const subs = [...(activeCat.value.subCategories || [])]
    if (editingSubIdx.value !== null) {
      subs[editingSubIdx.value] = { ...subs[editingSubIdx.value], name: subForm.value.name }
    }
    else {
      subs.push({ name: subForm.value.name, status: 'active' })
    }
    await $fetch(`/api/categories/${activeCat.value._id}`, {
      method: 'PUT',
      body: { subCategories: subs },
    })
    toast.success(editingSubIdx.value !== null ? 'Sub-category updated' : 'Sub-category added')
    showSubDialog.value = false
    await fetchCategories()
  }
  catch {
    toast.error('Failed to save sub-category')
  }
  finally {
    saving.value = false
  }
}

async function removeSub(cat: any, idx: number) {
  const subs = [...cat.subCategories]
  subs.splice(idx, 1)
  try {
    await $fetch(`/api/categories/${cat._id}`, {
      method: 'PUT',
      body: { subCategories: subs },
    })
    toast.success('Sub-category removed')
    await fetchCategories()
  }
  catch {
    toast.error('Failed to remove sub-category')
  }
}

async function handleRefresh() {
  search.value = ''
  await fetchCategories()
  toast.info('Data refreshed')
}
</script>

<template>
  <!-- Header Actions (teleported) -->
  <ClientOnly>
    <Teleport :to="`#${HEADER_ACTIONS_ID}`" defer>
      <div class="flex items-center gap-2">
        <div class="relative hidden sm:block">
          <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input v-model="search" placeholder="Search categories..." class="pl-8 h-8 w-48 lg:w-64 text-xs" />
        </div>
        <p class="text-xs text-muted-foreground tabular-nums whitespace-nowrap hidden md:block">
          {{ filteredCategories.length }} categor{{ filteredCategories.length !== 1 ? 'ies' : 'y' }}
        </p>
        <Button size="sm" class="h-8 text-xs" @click="openCreateCat">
          <Icon name="i-lucide-plus" class="mr-1 size-3.5" />
          Add Category
        </Button>
      </div>
    </Teleport>
  </ClientOnly>

  <div class="w-full flex flex-col gap-6">
    <!-- Mobile Search -->
    <div class="sm:hidden relative">
      <Icon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input v-model="search" placeholder="Search categories..." class="pl-9" />
    </div>

    <!-- KPI Stripe -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card class="relative overflow-hidden">
        <CardContent class="p-4 flex items-center gap-3">
          <div class="flex items-center justify-center rounded-xl bg-primary/10 p-2.5">
            <Icon name="i-lucide-tags" class="size-5 text-primary" />
          </div>
          <div>
            <p class="text-2xl font-bold tabular-nums leading-none">{{ categories.length }}</p>
            <p class="text-xs text-muted-foreground mt-0.5">Categories</p>
          </div>
        </CardContent>
      </Card>
      <Card class="relative overflow-hidden">
        <CardContent class="p-4 flex items-center gap-3">
          <div class="flex items-center justify-center rounded-xl bg-emerald-500/10 p-2.5">
            <Icon name="i-lucide-git-branch" class="size-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p class="text-2xl font-bold tabular-nums leading-none">{{ totalSubs }}</p>
            <p class="text-xs text-muted-foreground mt-0.5">Sub-categories</p>
          </div>
        </CardContent>
      </Card>
      <Card class="relative overflow-hidden">
        <CardContent class="p-4 flex items-center gap-3">
          <div class="flex items-center justify-center rounded-xl bg-blue-500/10 p-2.5">
            <Icon name="i-lucide-check-circle" class="size-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p class="text-2xl font-bold tabular-nums leading-none">{{ categories.filter((c: any) => c.status === 'active').length }}</p>
            <p class="text-xs text-muted-foreground mt-0.5">Active</p>
          </div>
        </CardContent>
      </Card>
      <Card class="relative overflow-hidden">
        <CardContent class="p-4 flex items-center gap-3">
          <div class="flex items-center justify-center rounded-xl bg-amber-500/10 p-2.5">
            <Icon name="i-lucide-layers" class="size-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p class="text-2xl font-bold tabular-nums leading-none">
              {{ categories.length ? (totalSubs / categories.length).toFixed(1) : '0' }}
            </p>
            <p class="text-xs text-muted-foreground mt-0.5">Avg Subs/Cat</p>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <Card v-for="i in 6" :key="i" class="p-6">
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <Skeleton class="size-10 rounded-xl" />
            <div class="flex-1 space-y-2">
              <Skeleton class="h-4 w-24" />
              <Skeleton class="h-3 w-40" />
            </div>
          </div>
          <Skeleton class="h-8 w-full" />
          <Skeleton class="h-8 w-3/4" />
        </div>
      </Card>
    </div>

    <!-- Category Cards Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <Card
        v-for="cat in filteredCategories"
        :key="cat._id"
        class="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
        :class="getColor(cat.color).border"
      >
        <!-- Color accent bar -->
        <div class="absolute top-0 left-0 right-0 h-1 opacity-60" :class="getColor(cat.color).bg.replace('/10', '')" />

        <CardHeader class="pb-3">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="flex items-center justify-center rounded-xl p-2.5 transition-colors" :class="getColor(cat.color).bg">
                <Icon :name="cat.icon || 'i-lucide-folder'" class="size-5" :class="getColor(cat.color).text" />
              </div>
              <div>
                <CardTitle class="text-base font-semibold leading-tight">{{ cat.name }}</CardTitle>
                <p v-if="cat.description" class="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {{ cat.description }}
                </p>
              </div>
            </div>
            <!-- Actions -->
            <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" class="size-7" @click="openEditCat(cat)">
                <Icon name="i-lucide-pencil" class="size-3" />
              </Button>
              <Button variant="ghost" size="icon" class="size-7 text-destructive hover:text-destructive" @click="confirmDeleteCat(cat)">
                <Icon name="i-lucide-trash-2" class="size-3" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent class="pt-0 space-y-3">
          <!-- Sub-categories -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <p class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Sub-categories
              </p>
              <Button variant="ghost" size="sm" class="h-6 text-xs px-2 gap-1" :class="getColor(cat.color).text" @click="openAddSub(cat)">
                <Icon name="i-lucide-plus" class="size-3" />
                Add
              </Button>
            </div>

            <div v-if="cat.subCategories?.length" class="flex flex-wrap gap-1.5">
              <div
                v-for="(sub, idx) in cat.subCategories"
                :key="sub._id || idx"
                class="group/sub inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium border transition-colors cursor-default"
                :class="[getColor(cat.color).bg, getColor(cat.color).text, getColor(cat.color).border]"
              >
                <span>{{ sub.name }}</span>
                <button
                  class="opacity-0 group-hover/sub:opacity-100 transition-opacity -mr-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5"
                  @click="openEditSub(cat, Number(idx))"
                >
                  <Icon name="i-lucide-pencil" class="size-2.5" />
                </button>
                <button
                  class="opacity-0 group-hover/sub:opacity-100 transition-opacity -mr-1 rounded-full hover:bg-destructive/20 p-0.5 text-destructive"
                  @click="removeSub(cat, Number(idx))"
                >
                  <Icon name="i-lucide-x" class="size-2.5" />
                </button>
              </div>
            </div>
            <p v-else class="text-xs text-muted-foreground/60 italic py-2">
              No sub-categories yet
            </p>
          </div>

          <!-- Footer info -->
          <div class="flex items-center justify-between pt-2 border-t border-border/50">
            <div class="flex items-center gap-1.5">
              <Badge variant="outline" class="text-[10px] px-1.5 py-0 font-normal" :class="cat.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-gray-500/10 text-gray-500 border-gray-500/20'">
                {{ cat.status }}
              </Badge>
              <span class="text-[10px] text-muted-foreground tabular-nums">
                {{ cat.subCategories?.length || 0 }} sub{{ cat.subCategories?.length !== 1 ? 's' : '' }}
              </span>
            </div>
            <span class="text-[10px] text-muted-foreground">
              {{ new Date(cat.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}
            </span>
          </div>
        </CardContent>
      </Card>

      <!-- Add Category Card -->
      <Card
        class="flex items-center justify-center border-dashed cursor-pointer transition-all duration-200 hover:border-primary/40 hover:bg-muted/30 min-h-[200px]"
        @click="openCreateCat"
      >
        <div class="flex flex-col items-center gap-2 text-muted-foreground">
          <div class="flex items-center justify-center rounded-xl bg-muted p-3">
            <Icon name="i-lucide-plus" class="size-6" />
          </div>
          <p class="text-sm font-medium">Add Category</p>
        </div>
      </Card>
    </div>

    <!-- Empty State -->
    <Card v-if="!loading && filteredCategories.length === 0 && search" class="p-12">
      <div class="flex flex-col items-center gap-3 text-muted-foreground">
        <Icon name="i-lucide-search-x" class="size-10" />
        <p class="font-medium">No categories match "{{ search }}"</p>
        <Button variant="outline" size="sm" @click="search = ''">
          Clear search
        </Button>
      </div>
    </Card>

    <!-- Create/Edit Category Dialog -->
    <Dialog v-model:open="showCatDialog">
      <DialogContent class="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{{ editingCat ? 'Edit' : 'New' }} Category</DialogTitle>
          <DialogDescription class="sr-only">
            {{ editingCat ? 'Edit' : 'Create' }} a category
          </DialogDescription>
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="saveCat">
          <div class="space-y-2">
            <Label for="catName">Name</Label>
            <Input id="catName" v-model="catForm.name" placeholder="e.g. Food" />
          </div>
          <div class="space-y-2">
            <Label for="catDesc">Description</Label>
            <Textarea id="catDesc" v-model="catForm.description" placeholder="What this category covers..." rows="2" />
          </div>
          <div class="space-y-2">
            <Label>Color</Label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="c in colorOptions"
                :key="c.value"
                type="button"
                class="size-8 rounded-lg transition-all duration-150 ring-2 ring-offset-2 ring-offset-background"
                :class="[c.class, catForm.color === c.value ? 'ring-primary scale-110' : 'ring-transparent hover:ring-muted-foreground/30']"
                @click="catForm.color = c.value"
              />
            </div>
          </div>
          <div class="space-y-2">
            <Label>Icon</Label>
            <div class="relative mb-2">
              <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input v-model="iconSearch" placeholder="Search icons..." class="pl-8 h-8 text-xs" />
            </div>
            <div class="grid grid-cols-8 gap-1.5 max-h-[200px] overflow-y-auto rounded-lg border p-2 bg-muted/30">
              <button
                v-for="ic in filteredIcons"
                :key="ic.name"
                type="button"
                class="flex items-center justify-center size-9 rounded-lg transition-all duration-150 border"
                :class="catForm.icon === ic.name
                  ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-md'
                  : 'bg-background border-transparent hover:border-border hover:bg-accent'"
                :title="ic.label"
                @click="catForm.icon = ic.name"
              >
                <Icon :name="ic.name" class="size-4" />
              </button>
              <div v-if="filteredIcons.length === 0" class="col-span-8 py-4 text-center text-xs text-muted-foreground">
                No icons match "{{ iconSearch }}"
              </div>
            </div>
            <p v-if="catForm.icon" class="text-xs text-muted-foreground flex items-center gap-1.5">
              Selected: <Icon :name="catForm.icon" class="size-4 text-primary" /> <code class="text-primary text-[10px]">{{ catForm.icon }}</code>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" @click="showCatDialog = false">Cancel</Button>
            <Button type="submit" :disabled="saving">
              <Icon v-if="saving" name="i-lucide-loader-2" class="mr-1 size-4 animate-spin" />
              {{ editingCat ? 'Update' : 'Create' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Add/Edit Sub-category Dialog -->
    <Dialog v-model:open="showSubDialog">
      <DialogContent class="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{{ editingSubIdx !== null ? 'Edit' : 'Add' }} Sub-category</DialogTitle>
          <DialogDescription>
            {{ editingSubIdx !== null ? 'Update' : 'Add to' }} <strong>{{ activeCat?.name }}</strong>
          </DialogDescription>
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="saveSub">
          <div class="space-y-2">
            <Label for="subName">Name</Label>
            <Input id="subName" v-model="subForm.name" placeholder="e.g. Dairy, Produce, Proteins..." />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" @click="showSubDialog = false">Cancel</Button>
            <Button type="submit" :disabled="saving">
              <Icon v-if="saving" name="i-lucide-loader-2" class="mr-1 size-4 animate-spin" />
              {{ editingSubIdx !== null ? 'Update' : 'Add' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Delete Confirmation -->
    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Category?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete <strong>{{ deletingCat?.name }}</strong> and all its sub-categories. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="handleDeleteCat">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
