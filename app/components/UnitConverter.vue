<script setup lang="ts">
import { convertUnit, getGroupedUnits, getUnit, getUnitAbbr, QUICK_CONVERSIONS, formatUnitValue, UNIT_CATEGORIES } from '~/constants/units'

const open = ref(false)
const fromValue = ref<number>(1)
const fromUnit = ref('lb')
const toUnit = ref('oz')
const activeCategory = ref<string>('weight')

const result = computed(() => {
  if (!fromValue.value || !fromUnit.value || !toUnit.value) return null
  return convertUnit(fromValue.value, fromUnit.value, toUnit.value)
})

const grouped = getGroupedUnits()

const categoryUnits = computed(() => {
  const group = grouped.find(g => g.category === activeCategory.value)
  return group?.units || []
})

// When category changes, reset to first two units in that category
watch(activeCategory, (cat) => {
  const units = grouped.find(g => g.category === cat)?.units
  if (units && units.length >= 2) {
    fromUnit.value = units[0]!.key
    toUnit.value = units[1]!.key
  }
})

function swapUnits() {
  const tmp = fromUnit.value
  fromUnit.value = toUnit.value
  toUnit.value = tmp
}

function applyQuickConversion(qc: typeof QUICK_CONVERSIONS[0]) {
  fromValue.value = qc.value
  fromUnit.value = qc.from
  toUnit.value = qc.to
  const from = getUnit(qc.from)
  if (from) activeCategory.value = from.category
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button variant="outline" size="sm" class="h-8 text-xs gap-1.5">
        <Icon name="i-lucide-arrow-right-left" class="size-3.5" />
        <span class="hidden sm:inline">Converter</span>
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-[380px] p-0" align="end">
      <!-- Header -->
      <div class="px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <h4 class="text-sm font-semibold flex items-center gap-2">
          <Icon name="i-lucide-arrow-right-left" class="size-4 text-primary" />
          Unit Converter
        </h4>
        <p class="text-[10px] text-muted-foreground mt-0.5">Convert between culinary measurements</p>
      </div>

      <!-- Category tabs -->
      <div class="flex gap-0.5 px-3 py-2 border-b overflow-x-auto">
        <button
          v-for="cat in UNIT_CATEGORIES.filter(c => c.key !== 'other')"
          :key="cat.key"
          type="button"
          class="px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap transition-all"
          :class="activeCategory === cat.key
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'"
          @click="activeCategory = cat.key"
        >
          {{ cat.label.split('/')[0]?.trim() }}
        </button>
      </div>

      <!-- Converter body -->
      <div class="p-4 space-y-4">
        <div class="flex items-end gap-2">
          <!-- From -->
          <div class="flex-1 space-y-1.5">
            <label class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">From</label>
            <Input
              v-model.number="fromValue"
              type="number"
              step="any"
              class="h-9 text-sm tabular-nums font-medium"
              placeholder="Value"
            />
            <select
              v-model="fromUnit"
              class="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option v-for="u in categoryUnits" :key="u.key" :value="u.key">
                {{ u.label }}
              </option>
            </select>
          </div>

          <!-- Swap button -->
          <div class="pb-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="size-8 rounded-full hover:bg-primary/10"
              @click="swapUnits"
            >
              <Icon name="i-lucide-arrow-right-left" class="size-3.5 text-primary" />
            </Button>
          </div>

          <!-- To -->
          <div class="flex-1 space-y-1.5">
            <label class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">To</label>
            <div
              class="h-9 flex items-center px-3 rounded-md border bg-muted/30 text-sm font-bold tabular-nums"
              :class="result?.success ? 'text-primary border-primary/20' : 'text-destructive border-destructive/20'"
            >
              {{ result?.success ? result.value : '—' }}
            </div>
            <select
              v-model="toUnit"
              class="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option v-for="u in categoryUnits" :key="u.key" :value="u.key">
                {{ u.label }}
              </option>
            </select>
          </div>
        </div>

        <!-- Result label -->
        <div v-if="result" class="text-center">
          <div v-if="result.success" class="px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
            <p class="text-xs text-muted-foreground">
              <span class="font-semibold text-foreground">{{ fromValue }} {{ getUnitAbbr(fromUnit) }}</span>
              <Icon name="i-lucide-equal" class="inline size-3 mx-1.5 text-muted-foreground" />
              <span class="font-bold text-primary">{{ result.value }} {{ getUnitAbbr(toUnit) }}</span>
            </p>
          </div>
          <p v-else class="text-xs text-destructive">{{ result.error }}</p>
        </div>

        <!-- Quick conversions -->
        <div>
          <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Quick Reference</p>
          <div class="grid grid-cols-2 gap-1">
            <button
              v-for="qc in QUICK_CONVERSIONS"
              :key="qc.label"
              type="button"
              class="text-left px-2 py-1.5 rounded text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              @click="applyQuickConversion(qc)"
            >
              {{ qc.label }}
            </button>
          </div>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
