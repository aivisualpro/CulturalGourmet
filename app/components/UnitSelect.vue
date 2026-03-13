<script setup lang="ts">
import { getGroupedUnits, getUnit, getUnitAbbr, convertUnit, getAllConversions, formatUnitValue, type UnitDef } from '~/constants/units'

const props = defineProps<{
  modelValue: string
  size?: 'sm' | 'default'
  placeholder?: string
  showConversion?: boolean
  conversionQty?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'converted': [result: { fromUnit: string, toUnit: string, fromQty: number, toQty: number }]
}>()

const open = ref(false)
const searchQuery = ref('')
const showConversionPanel = ref(false)

const grouped = getGroupedUnits()

const selectedUnit = computed(() => getUnit(props.modelValue))

const filteredGroups = computed(() => {
  if (!searchQuery.value) return grouped
  const q = searchQuery.value.toLowerCase()
  return grouped
    .map(g => ({
      ...g,
      units: g.units.filter(u =>
        u.label.toLowerCase().includes(q)
        || u.abbr.toLowerCase().includes(q)
        || u.key.toLowerCase().includes(q),
      ),
    }))
    .filter(g => g.units.length > 0)
})

// Conversion panel data
const conversionTarget = ref('')
const conversions = computed(() => {
  if (!props.modelValue || !props.conversionQty) return []
  return getAllConversions(props.conversionQty, props.modelValue)
})

const specificConversion = computed(() => {
  if (!conversionTarget.value || !props.conversionQty || !props.modelValue) return null
  return convertUnit(props.conversionQty, props.modelValue, conversionTarget.value)
})

function selectUnit(unit: UnitDef) {
  const oldUnit = props.modelValue
  emit('update:modelValue', unit.key)
  open.value = false
  searchQuery.value = ''

  // If we have a quantity, emit conversion event
  if (props.conversionQty && oldUnit && oldUnit !== unit.key) {
    const result = convertUnit(props.conversionQty, oldUnit, unit.key)
    if (result.success) {
      emit('converted', {
        fromUnit: oldUnit,
        toUnit: unit.key,
        fromQty: props.conversionQty,
        toQty: result.value,
      })
    }
  }
}

function toggleConversion() {
  showConversionPanel.value = !showConversionPanel.value
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
        <span v-if="selectedUnit" class="truncate flex items-center gap-1.5">
          <span class="font-medium">{{ selectedUnit.abbr }}</span>
          <span class="text-muted-foreground text-[10px] hidden sm:inline">({{ selectedUnit.label.split('(')[0]?.trim() }})</span>
        </span>
        <span v-else class="text-muted-foreground truncate">{{ placeholder || 'Select unit' }}</span>
        <Icon name="i-lucide-chevrons-up-down" class="size-3 shrink-0 opacity-50" />
      </button>
    </PopoverTrigger>

    <PopoverContent class="w-[280px] p-0" align="start">
      <!-- Search -->
      <div class="flex items-center border-b px-3 py-2">
        <Icon name="i-lucide-search" class="size-3.5 text-muted-foreground mr-2 shrink-0" />
        <input
          v-model="searchQuery"
          class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          placeholder="Search units..."
        >
        <!-- Conversion toggle -->
        <button
          v-if="showConversion && modelValue && conversionQty"
          type="button"
          class="ml-2 p-1 rounded hover:bg-muted transition-colors"
          :class="showConversionPanel ? 'bg-primary/10 text-primary' : 'text-muted-foreground'"
          title="Show conversions"
          @click.stop="toggleConversion"
        >
          <Icon name="i-lucide-arrow-right-left" class="size-3.5" />
        </button>
      </div>

      <!-- Conversion panel -->
      <div v-if="showConversionPanel && modelValue && conversionQty" class="border-b bg-muted/30">
        <div class="px-3 py-2">
          <p class="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
            Conversions for {{ conversionQty }} {{ getUnitAbbr(modelValue) }}
          </p>
          <div class="space-y-1 max-h-32 overflow-y-auto">
            <button
              v-for="c in conversions"
              :key="c.toUnit"
              type="button"
              class="w-full flex items-center justify-between px-2 py-1 rounded text-xs hover:bg-background transition-colors group"
              @click="selectUnit(getUnit(c.toUnit)!)"
            >
              <span class="flex items-center gap-1.5">
                <Icon name="i-lucide-arrow-right" class="size-3 text-muted-foreground group-hover:text-primary transition-colors" />
                <span class="font-medium tabular-nums">{{ c.value }}</span>
                <span class="text-muted-foreground">{{ getUnitAbbr(c.toUnit) }}</span>
              </span>
              <span class="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                Use this
              </span>
            </button>
            <p v-if="conversions.length === 0" class="text-xs text-muted-foreground text-center py-2">
              No compatible conversions available
            </p>
          </div>
        </div>
      </div>

      <!-- Unit list -->
      <div class="max-h-[280px] overflow-y-auto p-1">
        <template v-for="group in filteredGroups" :key="group.category">
          <div class="px-2 py-1.5">
            <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Icon :name="group.icon" class="size-3" />
              {{ group.label }}
            </p>
          </div>
          <button
            v-for="unit in group.units"
            :key="unit.key"
            type="button"
            class="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            :class="modelValue === unit.key ? 'bg-primary/5 text-primary font-medium' : ''"
            @click="selectUnit(unit)"
          >
            <Icon
              :name="modelValue === unit.key ? 'i-lucide-check' : 'i-lucide-circle'"
              class="size-3 shrink-0"
              :class="modelValue === unit.key ? 'text-primary' : 'text-muted-foreground/30'"
            />
            <span class="flex-1 text-left truncate">{{ unit.label }}</span>
            <span class="text-[10px] text-muted-foreground font-mono">{{ unit.abbr }}</span>
          </button>
        </template>

        <div v-if="filteredGroups.length === 0" class="text-center py-6 text-sm text-muted-foreground">
          <Icon name="i-lucide-search-x" class="size-5 mx-auto mb-1.5 opacity-50" />
          <p>No units found</p>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
