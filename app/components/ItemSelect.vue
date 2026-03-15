<script setup lang="ts">
import { toast } from 'vue-sonner'
import { getUnitAbbr } from '~/constants/units'

/**
 * ItemSelect — Searchable item picker that fetches from /api/items.
 * Features "Add New Item" that opens a mini creation form inline.
 * SKU is auto-generated. Category/SubCategory come from /api/categories.
 * When an item is selected, emits the item name + optional unit auto-fill.
 */
const props = defineProps<{
  modelValue: string
  size?: 'sm' | 'default'
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'itemSelected': [item: { name: string, unit: string, category: string, subCategory: string }]
}>()

const open = ref(false)
const searchQuery = ref('')
const store = useDataStore()
const items = computed(() => store.items.value)
const loadingItems = computed(() => !store.ready.value)
const showCreateForm = ref(false)
const savingNew = ref(false)

// New item form (no SKU — auto-generated on backend)
const newItemForm = ref({
  item: '',
  category: '',
  subCategory: '',
  unit: '',
})

async function fetchItems() {
  await store.fetchItems()
}

// Reset search when popover opens
watch(open, (isOpen) => {
  if (isOpen) {
    searchQuery.value = ''
    showCreateForm.value = false
  }
})

const filteredItems = computed(() => {
  if (!searchQuery.value) return items.value
  const q = searchQuery.value.toLowerCase()
  return items.value.filter((i: any) =>
    i.item?.toLowerCase().includes(q)
    || i.itemSKU?.toLowerCase().includes(q)
    || i.category?.toLowerCase().includes(q),
  )
})

const showCreateHint = computed(() => {
  if (!searchQuery.value.trim()) return false
  return !items.value.some(i => i.item?.toLowerCase() === searchQuery.value.toLowerCase().trim())
})

function selectItem(item: any) {
  emit('update:modelValue', item.item)
  emit('itemSelected', {
    name: item.item,
    unit: item.unit || '',
    category: item.category || '',
    subCategory: item.subCategory || '',
  })
  open.value = false
  searchQuery.value = ''
}

function openCreateForm() {
  newItemForm.value = {
    item: searchQuery.value.trim(),
    category: '',
    subCategory: '',
    unit: '',
  }
  showCreateForm.value = true
}

async function saveNewItem() {
  if (!newItemForm.value.item.trim()) {
    toast.error('Item name is required')
    return
  }
  savingNew.value = true
  try {
    const created = await $fetch<any>('/api/items', {
      method: 'POST',
      body: newItemForm.value,
    })
    toast.success(`Item "${newItemForm.value.item}" created`)
    // Auto-select the newly created item
    emit('update:modelValue', created.item || newItemForm.value.item)
    emit('itemSelected', {
      name: created.item || newItemForm.value.item,
      unit: created.unit || newItemForm.value.unit || '',
      category: created.category || newItemForm.value.category || '',
      subCategory: created.subCategory || newItemForm.value.subCategory || '',
    })
    showCreateForm.value = false
    open.value = false
    searchQuery.value = ''
    await fetchItems()
  }
  catch { toast.error('Failed to create item') }
  finally { savingNew.value = false }
}

const sizeClasses = computed(() => {
  return props.size === 'sm' ? 'h-8 text-xs px-2' : 'h-9 text-sm px-3'
})
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <button
        type="button"
        class="inline-flex items-center justify-between rounded-md border border-input bg-background ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full gap-1"
        :class="sizeClasses"
      >
        <span v-if="modelValue" class="truncate flex items-center gap-1.5">
          <Icon name="i-lucide-package" class="size-3 shrink-0 text-primary/60" />
          <span class="font-medium">{{ modelValue }}</span>
        </span>
        <span v-else class="text-muted-foreground truncate">{{ placeholder || 'Select item...' }}</span>
        <Icon name="i-lucide-chevrons-up-down" class="size-3 shrink-0 opacity-50" />
      </button>
    </PopoverTrigger>

    <PopoverContent class="w-[340px] p-0" align="start">
      <!-- Create New Item Form -->
      <div v-if="showCreateForm">
        <div class="px-4 py-3 border-b bg-gradient-to-r from-emerald-500/5 to-transparent">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-semibold flex items-center gap-1.5">
              <Icon name="i-lucide-plus-circle" class="size-4 text-emerald-500" />
              New Item
              <span class="text-[10px] font-normal text-muted-foreground ml-1">(SKU auto-generated)</span>
            </h4>
            <button
              type="button"
              class="text-muted-foreground hover:text-foreground transition-colors"
              @click="showCreateForm = false"
            >
              <Icon name="i-lucide-x" class="size-4" />
            </button>
          </div>
        </div>

        <div class="p-3 space-y-3">
          <!-- Item name -->
          <div class="space-y-1">
            <label class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Item Name <span class="text-destructive">*</span>
            </label>
            <Input v-model="newItemForm.item" placeholder="e.g. Chicken Breast" class="h-8 text-xs" />
          </div>

          <!-- Category + SubCategory from /api/categories -->
          <div class="space-y-1">
            <label class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Category & Sub-Category
            </label>
            <CategorySelect
              :category="newItemForm.category"
              :sub-category="newItemForm.subCategory"
              size="sm"
              @update:category="newItemForm.category = $event"
              @update:sub-category="newItemForm.subCategory = $event"
            />
          </div>

          <!-- Unit -->
          <div class="space-y-1">
            <label class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Unit</label>
            <UnitSelect v-model="newItemForm.unit" size="sm" placeholder="Select unit" />
          </div>

          <div class="flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="flex-1 h-8 text-xs"
              @click="showCreateForm = false"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              class="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
              :disabled="savingNew || !newItemForm.item.trim()"
              @click="saveNewItem"
            >
              <Icon v-if="savingNew" name="i-lucide-loader-2" class="mr-1 size-3 animate-spin" />
              <Icon v-else name="i-lucide-check" class="mr-1 size-3" />
              Create Item
            </Button>
          </div>
        </div>
      </div>

      <!-- Search & Browse -->
      <template v-else>
        <div class="flex items-center border-b px-3 py-2">
          <Icon name="i-lucide-search" class="size-3.5 text-muted-foreground mr-2 shrink-0" />
          <input
            v-model="searchQuery"
            class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search items..."
          >
        </div>

        <div class="max-h-[260px] overflow-y-auto p-1">
          <div v-if="loadingItems" class="py-6 text-center">
            <Icon name="i-lucide-loader-2" class="size-5 text-muted-foreground mx-auto animate-spin" />
            <p class="text-xs text-muted-foreground mt-2">Loading items...</p>
          </div>

          <template v-else>
            <!-- Create hint -->
            <button
              v-if="showCreateHint"
              type="button"
              class="w-full flex items-center gap-2.5 rounded-md px-2 py-2.5 text-sm transition-colors bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-1"
              @click="openCreateForm"
            >
              <div class="size-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Icon name="i-lucide-plus" class="size-3.5" />
              </div>
              <div class="text-left">
                <span class="font-medium">Create "<span class="font-bold">{{ searchQuery.trim() }}</span>"</span>
                <p class="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">as new inventory item</p>
              </div>
            </button>

            <!-- Item results -->
            <button
              v-for="item in filteredItems"
              :key="item._id"
              type="button"
              class="w-full flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              :class="modelValue === item.item ? 'bg-primary/5' : ''"
              @click="selectItem(item)"
            >
              <div class="size-6 rounded-full flex items-center justify-center shrink-0"
                :class="modelValue === item.item ? 'bg-primary/10' : 'bg-muted'"
              >
                <Icon
                  :name="modelValue === item.item ? 'i-lucide-check' : 'i-lucide-package'"
                  class="size-3"
                  :class="modelValue === item.item ? 'text-primary' : 'text-muted-foreground'"
                />
              </div>
              <div class="flex-1 text-left min-w-0">
                <p class="font-medium truncate" :class="modelValue === item.item ? 'text-primary' : ''">
                  {{ item.item }}
                </p>
                <div class="flex items-center gap-2">
                  <span v-if="item.category" class="text-[10px] text-muted-foreground">{{ item.category }}</span>
                  <span v-if="item.category && item.unit" class="text-[10px] text-muted-foreground/50">·</span>
                  <span v-if="item.unit" class="text-[10px] text-muted-foreground font-mono">{{ getUnitAbbr(item.unit) || item.unit }}</span>
                </div>
              </div>
              <span v-if="item.itemSKU" class="text-[10px] font-mono text-muted-foreground/60 shrink-0">{{ item.itemSKU }}</span>
            </button>

            <!-- Empty -->
            <div v-if="filteredItems.length === 0 && !showCreateHint" class="text-center py-6">
              <Icon name="i-lucide-package-open" class="size-6 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p class="text-xs text-muted-foreground">No items found</p>
              <button type="button" class="text-xs text-primary hover:underline mt-1" @click="openCreateForm">
                + Create new item
              </button>
            </div>
          </template>
        </div>

        <div class="border-t p-1">
          <button
            type="button"
            class="w-full flex items-center gap-2 rounded-md px-2 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            @click="openCreateForm"
          >
            <Icon name="i-lucide-plus-circle" class="size-3.5 text-emerald-500" />
            <span>Add new item to inventory</span>
          </button>
        </div>
      </template>
    </PopoverContent>
  </Popover>
</template>
