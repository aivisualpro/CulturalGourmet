<script setup lang="ts">
import { toast } from 'vue-sonner'

/**
 * CategorySelect — Fetches categories & subcategories from /api/categories.
 * Supports selecting a category, then a subcategory.
 * "Add New" creates the category/subcategory in the CG_Categories collection.
 */
const props = defineProps<{
  category: string
  subCategory: string
  size?: 'sm' | 'default'
}>()

const emit = defineEmits<{
  'update:category': [value: string]
  'update:subCategory': [value: string]
}>()

// ─── State ─────────────────────────────────────
const catOpen = ref(false)
const subOpen = ref(false)
const catSearch = ref('')
const subSearch = ref('')
const store = useDataStore()
const categories = computed(() => store.categories.value)
const loadingCats = computed(() => !store.ready.value)
const creatingCat = ref(false)
const creatingSub = ref(false)

async function fetchCategories() {
  await store.fetchCategories()
}

// Reset search when popovers open
watch(catOpen, (v) => { if (v) catSearch.value = '' })
watch(subOpen, (v) => { if (v) subSearch.value = '' })

// ─── Category logic ─────────────────────────────
const filteredCats = computed(() => {
  if (!catSearch.value) return categories.value
  const q = catSearch.value.toLowerCase()
  return categories.value.filter((c: any) => c.name?.toLowerCase().includes(q))
})

const showCreateCat = computed(() => {
  if (!catSearch.value.trim()) return false
  return !categories.value.some((c: any) => c.name?.toLowerCase() === catSearch.value.toLowerCase().trim())
})

function selectCategory(cat: any) {
  emit('update:category', cat.name)
  // If subcategory doesn't belong to this category, clear it
  const subs = (cat.subCategories || []).map((s: any) => s.name)
  if (props.subCategory && !subs.includes(props.subCategory)) {
    emit('update:subCategory', '')
  }
  catOpen.value = false
  catSearch.value = ''
}

async function createCategory() {
  const name = catSearch.value.trim()
  if (!name) return
  creatingCat.value = true
  try {
    await $fetch('/api/categories', { method: 'POST', body: { name } })
    emit('update:category', name)
    catOpen.value = false
    catSearch.value = ''
    toast.success(`Category "${name}" created`)
    await fetchCategories()
  }
  catch { toast.error('Failed to create category') }
  finally { creatingCat.value = false }
}

// ─── SubCategory logic ─────────────────────────
const activeCategoryObj = computed(() => {
  return categories.value.find((c: any) => c.name === props.category) || null
})

const subCategoryOptions = computed(() => {
  if (!activeCategoryObj.value) return []
  return (activeCategoryObj.value.subCategories || []).filter((s: any) => s.status === 'active')
})

const filteredSubs = computed(() => {
  if (!subSearch.value) return subCategoryOptions.value
  const q = subSearch.value.toLowerCase()
  return subCategoryOptions.value.filter((s: any) => s.name?.toLowerCase().includes(q))
})

const showCreateSub = computed(() => {
  if (!subSearch.value.trim()) return false
  return !subCategoryOptions.value.some((s: any) => s.name?.toLowerCase() === subSearch.value.toLowerCase().trim())
})

function selectSub(sub: any) {
  emit('update:subCategory', sub.name)
  subOpen.value = false
  subSearch.value = ''
}

async function createSubCategory() {
  const name = subSearch.value.trim()
  if (!name || !activeCategoryObj.value) return
  creatingSub.value = true
  try {
    const subs = [...(activeCategoryObj.value.subCategories || []), { name, status: 'active' }]
    await $fetch(`/api/categories/${activeCategoryObj.value._id}`, {
      method: 'PUT',
      body: { subCategories: subs },
    })
    emit('update:subCategory', name)
    subOpen.value = false
    subSearch.value = ''
    toast.success(`Sub-category "${name}" added to ${props.category}`)
    await fetchCategories()
  }
  catch { toast.error('Failed to create sub-category') }
  finally { creatingSub.value = false }
}

const sizeClasses = computed(() => {
  return props.size === 'sm' ? 'h-8 text-xs px-2' : 'h-9 text-sm px-3'
})
</script>

<template>
  <div class="flex gap-2">
    <!-- Category Picker -->
    <div class="flex-1">
      <Popover v-model:open="catOpen">
        <PopoverTrigger as-child>
          <button
            type="button"
            class="inline-flex items-center justify-between rounded-md border border-input bg-background ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full gap-1"
            :class="sizeClasses"
          >
            <span v-if="category" class="truncate flex items-center gap-1.5">
              <Icon name="i-lucide-tag" class="size-3 shrink-0 text-primary/60" />
              <span class="font-medium">{{ category }}</span>
            </span>
            <span v-else class="text-muted-foreground truncate">Category</span>
            <Icon name="i-lucide-chevrons-up-down" class="size-3 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent class="w-[240px] p-0" align="start">
          <div class="flex items-center border-b px-3 py-2">
            <Icon name="i-lucide-search" class="size-3.5 text-muted-foreground mr-2 shrink-0" />
            <input v-model="catSearch" class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder="Search categories...">
          </div>
          <div class="max-h-[220px] overflow-y-auto p-1">
            <!-- Loading -->
            <div v-if="loadingCats" class="py-4 text-center">
              <Icon name="i-lucide-loader-2" class="size-4 mx-auto animate-spin text-muted-foreground" />
            </div>
            <template v-else>
              <!-- Create new -->
              <button v-if="showCreateCat" type="button" class="w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm bg-primary/5 hover:bg-primary/10 text-primary mb-1" :disabled="creatingCat" @click="createCategory">
                <Icon :name="creatingCat ? 'i-lucide-loader-2' : 'i-lucide-plus'" class="size-3.5" :class="creatingCat ? 'animate-spin' : ''" />
                <span>Create "<strong>{{ catSearch.trim() }}</strong>"</span>
              </button>
              <!-- Options -->
              <button
                v-for="cat in filteredCats" :key="cat._id" type="button"
                class="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent"
                :class="category === cat.name ? 'bg-primary/5 text-primary font-medium' : ''"
                @click="selectCategory(cat)"
              >
                <Icon :name="cat.icon || 'i-lucide-folder'" class="size-3.5 shrink-0" :class="category === cat.name ? 'text-primary' : 'text-muted-foreground'" />
                <span class="flex-1 text-left truncate">{{ cat.name }}</span>
                <span class="text-[10px] text-muted-foreground tabular-nums">{{ cat.subCategories?.length || 0 }}</span>
              </button>
              <div v-if="filteredCats.length === 0 && !showCreateCat" class="text-center py-4 text-xs text-muted-foreground">
                <p>No categories yet</p><p class="mt-0.5">Type to create one</p>
              </div>
            </template>
          </div>
          <div v-if="category" class="border-t p-1">
            <button type="button" class="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" @click="emit('update:category', ''); emit('update:subCategory', ''); catOpen = false">
              <Icon name="i-lucide-x" class="size-3" /> Clear
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>

    <!-- SubCategory Picker -->
    <div class="flex-1">
      <Popover v-model:open="subOpen">
        <PopoverTrigger as-child>
          <button
            type="button"
            class="inline-flex items-center justify-between rounded-md border border-input bg-background ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full gap-1"
            :class="[sizeClasses, !category && 'opacity-50 pointer-events-none']"
          >
            <span v-if="subCategory" class="truncate flex items-center gap-1.5">
              <Icon name="i-lucide-tags" class="size-3 shrink-0 text-primary/60" />
              <span class="font-medium">{{ subCategory }}</span>
            </span>
            <span v-else class="text-muted-foreground truncate">Sub-category</span>
            <Icon name="i-lucide-chevrons-up-down" class="size-3 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent class="w-[240px] p-0" align="start">
          <div class="flex items-center border-b px-3 py-2">
            <Icon name="i-lucide-search" class="size-3.5 text-muted-foreground mr-2 shrink-0" />
            <input v-model="subSearch" class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder="Search sub-categories...">
          </div>
          <div v-if="!category" class="p-4 text-center text-xs text-muted-foreground">
            <Icon name="i-lucide-alert-circle" class="size-4 mx-auto mb-1 opacity-50" />
            <p>Select a category first</p>
          </div>
          <div v-else class="max-h-[220px] overflow-y-auto p-1">
            <!-- Create new -->
            <button v-if="showCreateSub" type="button" class="w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-1" :disabled="creatingSub" @click="createSubCategory">
              <Icon :name="creatingSub ? 'i-lucide-loader-2' : 'i-lucide-plus'" class="size-3.5" :class="creatingSub ? 'animate-spin' : ''" />
              <span>Create "<strong>{{ subSearch.trim() }}</strong>" in {{ category }}</span>
            </button>
            <!-- Options -->
            <button
              v-for="sub in filteredSubs" :key="sub._id || sub.name" type="button"
              class="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent"
              :class="subCategory === sub.name ? 'bg-primary/5 text-primary font-medium' : ''"
              @click="selectSub(sub)"
            >
              <Icon :name="subCategory === sub.name ? 'i-lucide-check' : 'i-lucide-circle'" class="size-3 shrink-0" :class="subCategory === sub.name ? 'text-primary' : 'text-muted-foreground/30'" />
              <span class="flex-1 text-left truncate">{{ sub.name }}</span>
            </button>
            <div v-if="filteredSubs.length === 0 && !showCreateSub" class="text-center py-4 text-xs text-muted-foreground">
              <p>No sub-categories in "{{ category }}"</p><p class="mt-0.5">Type to create one</p>
            </div>
          </div>
          <div v-if="subCategory" class="border-t p-1">
            <button type="button" class="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" @click="emit('update:subCategory', ''); subOpen = false">
              <Icon name="i-lucide-x" class="size-3" /> Clear
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  </div>
</template>
