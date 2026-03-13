<script setup lang="ts">
/**
 * CreatableSelect — A searchable dropdown with an "Add New" option.
 * Perfect for fields like Category, SubCategory where the user can pick
 * from existing values or create a new one on the fly.
 */
const props = defineProps<{
  modelValue: string
  options: string[]
  placeholder?: string
  size?: 'sm' | 'default'
  icon?: string
  label?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'create': [value: string]
}>()

const open = ref(false)
const searchQuery = ref('')

const filteredOptions = computed(() => {
  if (!searchQuery.value) return props.options
  const q = searchQuery.value.toLowerCase()
  return props.options.filter(o => o.toLowerCase().includes(q))
})

const showCreateOption = computed(() => {
  if (!searchQuery.value.trim()) return false
  return !props.options.some(o => o.toLowerCase() === searchQuery.value.toLowerCase().trim())
})

function selectOption(value: string) {
  emit('update:modelValue', value)
  open.value = false
  searchQuery.value = ''
}

function createNew() {
  const val = searchQuery.value.trim()
  if (!val) return
  emit('update:modelValue', val)
  emit('create', val)
  open.value = false
  searchQuery.value = ''
}

const sizeClasses = computed(() => {
  return props.size === 'sm'
    ? 'h-8 text-xs px-2'
    : 'h-9 text-sm px-3'
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
          <Icon v-if="icon" :name="icon" class="size-3 shrink-0 text-muted-foreground" />
          <span class="font-medium">{{ modelValue }}</span>
        </span>
        <span v-else class="text-muted-foreground truncate">{{ placeholder || 'Select...' }}</span>
        <Icon name="i-lucide-chevrons-up-down" class="size-3 shrink-0 opacity-50" />
      </button>
    </PopoverTrigger>

    <PopoverContent class="w-[240px] p-0" align="start">
      <!-- Search -->
      <div class="flex items-center border-b px-3 py-2">
        <Icon name="i-lucide-search" class="size-3.5 text-muted-foreground mr-2 shrink-0" />
        <input
          v-model="searchQuery"
          class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          :placeholder="`Search${label ? ' ' + label.toLowerCase() : ''}...`"
        >
      </div>

      <!-- Options list -->
      <div class="max-h-[220px] overflow-y-auto p-1">
        <!-- Create new option -->
        <button
          v-if="showCreateOption"
          type="button"
          class="w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors bg-primary/5 hover:bg-primary/10 text-primary mb-1"
          @click="createNew"
        >
          <div class="size-5 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon name="i-lucide-plus" class="size-3" />
          </div>
          <span class="flex-1 text-left">
            Create "<span class="font-semibold">{{ searchQuery.trim() }}</span>"
          </span>
        </button>

        <!-- Existing options -->
        <button
          v-for="option in filteredOptions"
          :key="option"
          type="button"
          class="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          :class="modelValue === option ? 'bg-primary/5 text-primary font-medium' : ''"
          @click="selectOption(option)"
        >
          <Icon
            :name="modelValue === option ? 'i-lucide-check' : 'i-lucide-circle'"
            class="size-3 shrink-0"
            :class="modelValue === option ? 'text-primary' : 'text-muted-foreground/30'"
          />
          <span class="flex-1 text-left truncate">{{ option }}</span>
        </button>

        <!-- Empty state -->
        <div v-if="filteredOptions.length === 0 && !showCreateOption" class="text-center py-4 text-sm text-muted-foreground">
          <Icon name="i-lucide-inbox" class="size-5 mx-auto mb-1.5 opacity-50" />
          <p>No options yet</p>
          <p class="text-xs mt-0.5">Type to create one</p>
        </div>
      </div>

      <!-- Clear button -->
      <div v-if="modelValue" class="border-t p-1">
        <button
          type="button"
          class="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          @click="selectOption('')"
        >
          <Icon name="i-lucide-x" class="size-3" />
          Clear selection
        </button>
      </div>
    </PopoverContent>
  </Popover>
</template>
