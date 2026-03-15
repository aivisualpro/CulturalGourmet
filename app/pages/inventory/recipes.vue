<script setup lang="ts">
import { toast } from 'vue-sonner'
import { watchDebounced } from '@vueuse/core'
import { HEADER_ACTIONS_ID } from '~/composables/usePageHeader'
import { getUnitAbbr } from '~/constants/units'

const { setHeader } = usePageHeader()
setHeader({ title: 'Recipes', icon: 'i-lucide-chef-hat' })

// ─── State ──────────────────────────────────────────────────
const { recipes, ready: storeReady, fetchRecipes } = useDataStore()
const loading = computed(() => !storeReady.value)
const search = ref('')
const showDialog = ref(false)
const showDeleteDialog = ref(false)
const showDetailDialog = ref(false)
const editingRecipe = ref<any>(null)
const deletingRecipe = ref<any>(null)
const viewingRecipe = ref<any>(null)
const saving = ref(false)
const isAutoSaving = ref(false)
const autoSaveError = ref(false)
const lastSaved = ref<Date | null>(null)
const activeTab = ref('details')

interface Ingredient {
  name: string
  quantity: number
  unit: string
  comments: string
}

interface SubRecipe {
  recipeName: string
  quantity: number | undefined
}

const defaultForm = () => ({
  recipeName: '',
  unit: '',
  ingredients: [] as Ingredient[],
  subRecipes: [] as SubRecipe[],
  methodOfPreparation: '',
  chefNotes: '',
  chefLink: '',
  coolingProcedures: '',
  additionalNotes: '',
})

const formData = ref(defaultForm())

// ─── Auto-Save (Watch) ──────────────────────────────────────
watchDebounced(formData, async () => {
  // Only auto-save if editing an existing recipe, and Name is present
  if (!editingRecipe.value || !formData.value.recipeName.trim()) return
  
  isAutoSaving.value = true
  autoSaveError.value = false
  
  const payload = {
    ...formData.value,
    ingredients: formData.value.ingredients.filter(ing => ing.name.trim()),
    subRecipes: formData.value.subRecipes.filter(sr => sr.recipeName.trim()),
  }

  try {
    await $fetch(`/api/recipes/${editingRecipe.value._id}`, { method: 'PUT', body: payload })
    await fetchRecipes() // Re-fetch to keep inventory metrics consistent locally
    lastSaved.value = new Date()
  } catch (error) {
    console.error('Auto-save failed:', error)
    autoSaveError.value = true
  } finally {
    isAutoSaving.value = false
  }
}, { debounce: 1000, deep: true })

// ─── Computed ───────────────────────────────────────────────
const filtered = computed(() => {
  if (!search.value) return recipes.value
  const q = search.value.toLowerCase()
  return recipes.value.filter((r: any) =>
    r.recipeName?.toLowerCase().includes(q)
    || r.ingredients?.some((ing: any) => ing.name?.toLowerCase().includes(q)),
  )
})

// ─── Ingredients ────────────────────────────────────────────
function addIngredient() {
  formData.value.ingredients.push({
    name: '', quantity: null as any, unit: '', comments: '',
  })
}

function handleIngredientUnitConverted(index: number, result: { fromUnit: string, toUnit: string, fromQty: number, toQty: number }) {
  const ingredient = formData.value.ingredients[index]
  if (!ingredient) return
  ingredient.quantity = Math.round(result.toQty * 10000) / 10000
  toast.info(`Auto-converted: ${result.fromQty} ${getUnitAbbr(result.fromUnit)} → ${result.toQty} ${getUnitAbbr(result.toUnit)}`)
}

function removeIngredient(index: number) {
  formData.value.ingredients.splice(index, 1)
}

function handleItemSelected(index: number, item: { name: string, unit: string }) {
  const ingredient = formData.value.ingredients[index]
  if (!ingredient) return
  if (item.unit && !ingredient.unit) {
    ingredient.unit = item.unit
  }
}

// ─── Sub-Recipes ────────────────────────────────────────────
const subRecipeOpen = ref<number | null>(null)
const subRecipeSearch = ref('')

function addSubRecipe() {
  formData.value.subRecipes.push({ recipeName: '', quantity: undefined })
}

function removeSubRecipe(index: number) {
  formData.value.subRecipes.splice(index, 1)
}

// Recipes available as sub-recipes (exclude the current recipe being edited)
const availableSubRecipes = computed(() => {
  const currentName = formData.value.recipeName?.toLowerCase()
  let list = recipes.value.filter((r: any) => r.recipeName?.toLowerCase() !== currentName)
  if (subRecipeSearch.value) {
    const q = subRecipeSearch.value.toLowerCase()
    list = list.filter((r: any) => r.recipeName?.toLowerCase().includes(q))
  }
  return list
})

function selectSubRecipe(index: number, recipe: any) {
  formData.value.subRecipes[index]!.recipeName = recipe.recipeName
  subRecipeOpen.value = null
  subRecipeSearch.value = ''
}

// ─── CRUD ───────────────────────────────────────────────────
function openCreate() {
  editingRecipe.value = null
  formData.value = defaultForm()
  lastSaved.value = null
  autoSaveError.value = false
  activeTab.value = 'details'
  showDialog.value = true
}

function openEdit(recipe: any) {
  editingRecipe.value = recipe
  formData.value = {
    recipeName: recipe.recipeName || '',
    unit: recipe.unit || '',
    ingredients: (recipe.ingredients || []).map((ing: any) => ({
      name: ing.name || '',
      quantity: ing.quantity || 0,
      unit: ing.unit || '',
      comments: ing.comments || '',
    })),
    subRecipes: (recipe.subRecipes || []).map((sr: any) => ({
      recipeName: sr.recipeName || '',
      quantity: sr.quantity ?? undefined,
    })),
    methodOfPreparation: recipe.methodOfPreparation || '',
    chefNotes: recipe.chefNotes || '',
    chefLink: recipe.chefLink || '',
    coolingProcedures: recipe.coolingProcedures || '',
    additionalNotes: recipe.additionalNotes || '',
  }
  lastSaved.value = null
  autoSaveError.value = false
  activeTab.value = 'details'
  showDialog.value = true
}

function openDetail(recipe: any) {
  viewingRecipe.value = recipe
  showDetailDialog.value = true
}

async function handleSave() {
  if (!formData.value.recipeName.trim()) { toast.error('Recipe name is required'); return }
  saving.value = true

  const payload = {
    ...formData.value,
    ingredients: formData.value.ingredients.filter(ing => ing.name.trim()),
    subRecipes: formData.value.subRecipes.filter(sr => sr.recipeName.trim()),
  }

  try {
    if (editingRecipe.value) {
      await $fetch(`/api/recipes/${editingRecipe.value._id}`, { method: 'PUT', body: payload })
      toast.success('Recipe updated')
    }
    else {
      await $fetch('/api/recipes', { method: 'POST', body: payload })
      toast.success('Recipe created')
    }
    showDialog.value = false
    await fetchRecipes()
  }
  catch { toast.error('Failed to save recipe') }
  finally { saving.value = false }
}

function confirmDelete(recipe: any) { deletingRecipe.value = recipe; showDeleteDialog.value = true }

async function handleDelete() {
  if (!deletingRecipe.value) return
  try {
    await $fetch(`/api/recipes/${deletingRecipe.value._id}`, { method: 'DELETE' })
    toast.success('Recipe deleted')
    showDeleteDialog.value = false
    deletingRecipe.value = null
    await fetchRecipes()
  }
  catch { toast.error('Failed to delete recipe') }
}
</script>

<template>
  <ClientOnly>
    <Teleport :to="`#${HEADER_ACTIONS_ID}`" defer>
      <div class="flex items-center gap-2">
        <div class="relative hidden sm:block">
          <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input v-model="search" placeholder="Search recipes..." class="pl-8 h-8 w-48 lg:w-64 text-xs" />
        </div>
        <p class="text-xs text-muted-foreground tabular-nums whitespace-nowrap hidden md:block">
          {{ filtered.length }} recipe{{ filtered.length !== 1 ? 's' : '' }}
        </p>
        <UnitConverter />
        <Button size="sm" class="h-8 text-xs" @click="openCreate">
          <Icon name="i-lucide-plus" class="mr-1 size-3.5" />Add Recipe
        </Button>
      </div>
    </Teleport>
  </ClientOnly>

  <div class="w-full flex flex-col gap-6">
    <!-- Mobile Search -->
    <div class="sm:hidden relative">
      <Icon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input v-model="search" placeholder="Search recipes..." class="pl-9" />
    </div>

    <!-- ─── Loading ────────────────────────────────────── -->
    <Card v-if="loading" class="p-6">
      <div class="space-y-4"><Skeleton class="h-10 w-full" /><Skeleton class="h-10 w-full" /><Skeleton class="h-10 w-full" /><Skeleton class="h-10 w-3/4" /></div>
    </Card>

    <!-- ─── Recipe Cards Grid ────────────────────────────── -->
    <div v-else-if="filtered.length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <Card
        v-for="recipe in filtered"
        :key="recipe._id"
        class="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
        @click="openDetail(recipe)"
      >
        <!-- Top gradient accent -->
        <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40 opacity-60 group-hover:opacity-100 transition-opacity" />

        <CardContent class="p-5">
          <!-- Header row -->
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-base truncate group-hover:text-primary transition-colors">
                {{ recipe.recipeName }}
              </h3>
              <span v-if="recipe.unit" class="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                <Icon name="i-lucide-beaker" class="size-3" />
                {{ getUnitAbbr(recipe.unit) || recipe.unit }}
              </span>
            </div>
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2" @click.stop>
              <Button variant="ghost" size="icon" class="size-7" @click="openEdit(recipe)">
                <Icon name="i-lucide-pencil" class="size-3" />
              </Button>
              <Button variant="ghost" size="icon" class="size-7 text-destructive hover:text-destructive" @click="confirmDelete(recipe)">
                <Icon name="i-lucide-trash-2" class="size-3" />
              </Button>
            </div>
          </div>

          <!-- Ingredient preview pills -->
          <div v-if="recipe.ingredients?.length || recipe.subRecipes?.length" class="flex flex-wrap gap-1.5">
            <span
              v-for="(ing, idx) in recipe.ingredients.slice(0, 4)"
              :key="'ing-' + idx"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-medium text-foreground"
            >
              <span class="size-1.5 rounded-full bg-primary" />
              {{ ing.name }}
              <span v-if="ing.quantity" class="text-primary font-semibold">×{{ ing.quantity }} {{ getUnitAbbr(ing.unit) }}</span>
            </span>
            <span
              v-for="(sr, idx) in recipe.subRecipes?.slice(0, 2)"
              :key="'sr-' + idx"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-medium text-foreground"
            >
              <Icon name="i-lucide-chef-hat" class="size-2.5 text-amber-500" />
              {{ sr.recipeName }}
              <span v-if="sr.quantity" class="text-amber-600 dark:text-amber-400 font-semibold">×{{ sr.quantity }}</span>
            </span>
            <span
              v-if="(recipe.ingredients?.length || 0) + (recipe.subRecipes?.length || 0) > 6"
              class="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/15 border border-primary/20 text-[10px] font-semibold text-primary"
            >
              +{{ (recipe.ingredients?.length || 0) + (recipe.subRecipes?.length || 0) - 6 }} more
            </span>
          </div>
          <p v-else class="text-xs text-muted-foreground italic">No ingredients added</p>

          <!-- Footer: ingredient + sub-recipe count -->
          <div class="flex items-center gap-3 mt-4 pt-3 border-t border-border/50 text-[11px] text-muted-foreground">
            <span class="flex items-center gap-1">
              <Icon name="i-lucide-list" class="size-3" />
              {{ recipe.ingredients?.length || 0 }} ingredient{{ recipe.ingredients?.length !== 1 ? 's' : '' }}
            </span>
            <span v-if="recipe.subRecipes?.length" class="flex items-center gap-1">
              <Icon name="i-lucide-chef-hat" class="size-3 text-amber-500" />
              {{ recipe.subRecipes.length }} sub-recipe{{ recipe.subRecipes.length !== 1 ? 's' : '' }}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Empty State -->
    <Card v-else class="p-12">
      <div class="flex flex-col items-center gap-4 text-center">
        <div class="size-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Icon name="i-lucide-chef-hat" class="size-8 text-primary" />
        </div>
        <div>
          <h3 class="text-lg font-semibold">No recipes yet</h3>
          <p class="text-sm text-muted-foreground mt-1">Create your first recipe to start tracking ingredients.</p>
        </div>
        <Button @click="openCreate">
          <Icon name="i-lucide-plus" class="mr-1.5 size-4" />Create Recipe
        </Button>
      </div>
    </Card>

    <!-- ═══ Detail View Dialog ═══ -->
    <Dialog v-model:open="showDetailDialog">
      <DialogContent class="sm:max-w-[720px] max-h-[90vh] overflow-y-auto p-0">
        <div v-if="viewingRecipe" class="relative">
          <!-- Detail Header -->
          <div class="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 py-5 border-b">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-xl font-bold">{{ viewingRecipe.recipeName }}</h2>
                <span v-if="viewingRecipe.unit" class="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Icon name="i-lucide-beaker" class="size-3" />
                  {{ getUnitAbbr(viewingRecipe.unit) || viewingRecipe.unit }}
                </span>
              </div>
              <Button variant="outline" size="sm" class="text-xs" @click="showDetailDialog = false; openEdit(viewingRecipe)">
                <Icon name="i-lucide-pencil" class="mr-1 size-3" />Edit
              </Button>
            </div>
          </div>

          <div class="px-6 py-5 space-y-5">
            <!-- Ingredients Table -->
            <div v-if="viewingRecipe.ingredients?.length">
              <h4 class="text-sm font-semibold mb-2.5 flex items-center gap-2">
                <Icon name="i-lucide-list" class="size-4 text-primary" />
                Ingredients & Components
              </h4>
              <div class="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow class="bg-muted/30">
                      <TableHead class="text-xs font-semibold">Ingredient</TableHead>
                      <TableHead class="text-xs font-semibold text-right">Qty</TableHead>
                      <TableHead class="text-xs font-semibold">Unit</TableHead>
                      <TableHead class="text-xs font-semibold">Comments</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow v-for="(ing, idx) in viewingRecipe.ingredients" :key="idx">
                      <TableCell class="text-sm font-medium">{{ ing.name }}</TableCell>
                      <TableCell class="text-sm text-right tabular-nums">{{ ing.quantity }}</TableCell>
                      <TableCell class="text-sm text-muted-foreground">{{ getUnitAbbr(ing.unit) || ing.unit }}</TableCell>
                      <TableCell class="text-xs text-muted-foreground max-w-[160px] truncate">{{ ing.comments || '—' }}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            <!-- Sub-Recipes -->
            <div v-if="viewingRecipe.subRecipes?.length">
              <h4 class="text-sm font-semibold mb-2.5 flex items-center gap-2">
                <Icon name="i-lucide-chef-hat" class="size-4 text-amber-500" />
                Sub-Recipes
              </h4>
              <div class="rounded-lg border border-amber-500/20 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow class="bg-amber-500/10">
                      <TableHead class="text-xs font-semibold">Recipe</TableHead>
                      <TableHead class="text-xs font-semibold text-right">Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow v-for="(sr, idx) in viewingRecipe.subRecipes" :key="'sr-' + idx">
                      <TableCell class="text-sm font-medium">
                        <span class="inline-flex items-center gap-1.5">
                          <Icon name="i-lucide-chef-hat" class="size-3 text-amber-500" />
                          {{ sr.recipeName }}
                        </span>
                      </TableCell>
                      <TableCell class="text-sm text-right tabular-nums">{{ sr.quantity ?? '—' }}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            <!-- Method, Chef Notes, Cooling, Additional Notes -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-if="viewingRecipe.methodOfPreparation" class="p-4 rounded-lg border bg-muted/20">
                <h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Icon name="i-lucide-clipboard-list" class="size-3.5" />Method of Preparation
                </h4>
                <p class="text-sm whitespace-pre-wrap leading-relaxed">{{ viewingRecipe.methodOfPreparation }}</p>
              </div>
              <div v-if="viewingRecipe.chefNotes" class="p-4 rounded-lg border bg-muted/20">
                <h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Icon name="i-lucide-message-square" class="size-3.5" />Chef Notes
                </h4>
                <p class="text-sm whitespace-pre-wrap leading-relaxed">{{ viewingRecipe.chefNotes }}</p>
              </div>
              <div v-if="viewingRecipe.coolingProcedures" class="p-4 rounded-lg border bg-muted/20">
                <h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Icon name="i-lucide-thermometer-snowflake" class="size-3.5" />Cooling Procedures
                </h4>
                <p class="text-sm whitespace-pre-wrap leading-relaxed">{{ viewingRecipe.coolingProcedures }}</p>
              </div>
              <div v-if="viewingRecipe.additionalNotes" class="p-4 rounded-lg border bg-muted/20">
                <h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Icon name="i-lucide-sticky-note" class="size-3.5" />Additional Notes
                </h4>
                <p class="text-sm whitespace-pre-wrap leading-relaxed">{{ viewingRecipe.additionalNotes }}</p>
              </div>
            </div>

            <div v-if="viewingRecipe.chefLink" class="flex items-center gap-2 text-sm">
              <Icon name="i-lucide-link" class="size-3.5 text-muted-foreground" />
              <a :href="viewingRecipe.chefLink" target="_blank" class="text-primary hover:underline truncate">{{ viewingRecipe.chefLink }}</a>
            </div>
          </div>
        </div>
        <DialogHeader class="sr-only">
          <DialogTitle>Recipe Details</DialogTitle>
          <DialogDescription>View recipe details</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>

    <!-- ═══ Create/Edit Dialog ═══ -->
    <Dialog v-model:open="showDialog">
      <DialogContent class="sm:max-w-[780px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ editingRecipe ? 'Edit' : 'New' }} Recipe</DialogTitle>
          <DialogDescription class="sr-only">{{ editingRecipe ? 'Edit' : 'Create' }} a recipe</DialogDescription>
        </DialogHeader>
        <form class="space-y-5" @submit.prevent="handleSave">
          <!-- Tab navigation -->
          <div class="flex gap-1 p-1 rounded-lg bg-muted/50">
            <button
              v-for="tab in [
                { key: 'details', label: 'Details', icon: 'i-lucide-file-text' },
                { key: 'ingredients', label: 'Ingredients', icon: 'i-lucide-list' },
                { key: 'notes', label: 'Notes & Method', icon: 'i-lucide-clipboard-list' },
              ]"
              :key="tab.key"
              type="button"
              class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all"
              :class="activeTab === tab.key ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'"
              @click="activeTab = tab.key"
            >
              <Icon :name="tab.icon" class="size-3.5" />
              {{ tab.label }}
              <span v-if="tab.key === 'ingredients'" class="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full tabular-nums ml-0.5">
                {{ formData.ingredients.length }}
              </span>
            </button>
          </div>

          <!-- Tab: Details -->
          <div v-show="activeTab === 'details'" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="recipeName">Recipe Name <span class="text-destructive">*</span></Label>
                <Input id="recipeName" v-model="formData.recipeName" placeholder="e.g. Queens Peach" />
              </div>
              <div class="space-y-2">
                <Label for="unit">Unit</Label>
                <UnitSelect v-model="formData.unit" placeholder="Select unit" />
              </div>
            </div>
          </div>

          <!-- Tab: Ingredients -->
          <div v-show="activeTab === 'ingredients'" class="space-y-6">
            <!-- ── Ingredients Section ── -->
            <div class="space-y-3">
              <div class="flex items-center justify-between mt-1">
                <Label class="text-sm font-semibold">Ingredients</Label>
              </div>

              <div v-if="formData.ingredients.length === 0" class="text-center py-6 border border-dashed rounded-lg">
                <Icon name="i-lucide-salad" class="size-6 text-muted-foreground mx-auto mb-1.5" />
                <p class="text-xs text-muted-foreground">No ingredients added yet</p>
                <Button type="button" variant="ghost" size="sm" class="mt-1.5 text-xs" @click="addIngredient">
                  <Icon name="i-lucide-plus" class="mr-1 size-3" />Add first ingredient
                </Button>
              </div>

              <div v-else class="rounded-lg border overflow-hidden">
                <div class="grid grid-cols-[28px_2fr_1fr_1fr_1fr_28px] gap-2 px-3 py-2 bg-muted/40 border-b text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <span>#</span>
                  <span>Name <span class="text-destructive normal-case">*</span></span>
                  <span>Qty</span>
                  <span>Unit</span>
                  <span>Comments</span>
                  <span />
                </div>
                <div
                  v-for="(ing, index) in formData.ingredients"
                  :key="index"
                  class="grid grid-cols-[28px_2fr_1fr_1fr_1fr_28px] gap-2 px-3 py-2 items-center group/ing transition-colors hover:bg-muted/20"
                  :class="index < formData.ingredients.length - 1 && 'border-b border-border/40'"
                >
                  <span class="size-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] text-primary font-bold tabular-nums">{{ index + 1 }}</span>
                  <ItemSelect
                    v-model="ing.name"
                    size="sm"
                    placeholder="Search items..."
                    @item-selected="(item) => handleItemSelected(index, item)"
                  />
                  <Input v-model.number="ing.quantity" type="number" step="any" min="0" placeholder="0" class="h-8 text-sm" />
                  <UnitSelect
                    v-model="ing.unit"
                    size="sm"
                    placeholder="Unit"
                    :show-conversion="true"
                    :conversion-qty="ing.quantity"
                    @converted="(r) => handleIngredientUnitConverted(index, r)"
                  />
                  <Input v-model="ing.comments" placeholder="Note..." class="h-8 text-sm" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="size-6 text-destructive hover:text-destructive opacity-0 group-hover/ing:opacity-100 transition-opacity"
                    @click="removeIngredient(index)"
                  >
                    <Icon name="i-lucide-trash-2" class="size-3" />
                  </Button>
                </div>
              </div>

              <!-- Add Ingredient Button placed below the table when rows exist -->
              <Button v-if="formData.ingredients.length > 0" type="button" variant="outline" size="sm" class="w-full h-8 text-xs border-dashed text-muted-foreground hover:text-foreground hover:border-solid mt-2 transition-all group" @click="addIngredient">
                <Icon name="i-lucide-plus" class="mr-1.5 size-3.5 text-muted-foreground group-hover:text-foreground" /> Add Ingredient
              </Button>
            </div>

            <!-- ── Sub-Recipes Section ── -->
            <div class="space-y-3">
              <div class="flex items-center justify-between mt-1">
                <Label class="text-sm font-semibold flex items-center gap-1.5">
                  <Icon name="i-lucide-chef-hat" class="size-3.5 text-amber-500" />
                  Sub-Recipes
                </Label>
              </div>

              <div v-if="formData.subRecipes.length === 0" class="text-center py-5 border border-dashed border-amber-500/30 rounded-lg bg-amber-500/5">
                <Icon name="i-lucide-chef-hat" class="size-5 text-amber-500/50 mx-auto mb-1" />
                <p class="text-xs text-muted-foreground">Add another recipe as a sub-component</p>
                <Button type="button" variant="ghost" size="sm" class="mt-1.5 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-500/10" @click="addSubRecipe">
                  <Icon name="i-lucide-plus" class="mr-1 size-3" />Add first sub-recipe
                </Button>
              </div>

              <div v-else class="rounded-lg border border-amber-500/20 overflow-hidden">
                <div class="grid grid-cols-[28px_2fr_1fr_28px] gap-2 px-3 py-2 bg-amber-500/10 border-b border-amber-500/20 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <span>#</span>
                  <span>Recipe</span>
                  <span>Qty</span>
                  <span />
                </div>
                <div
                  v-for="(sr, index) in formData.subRecipes"
                  :key="'sr-' + index"
                  class="grid grid-cols-[28px_2fr_1fr_28px] gap-2 px-3 py-2 items-center group/sr transition-colors hover:bg-amber-500/5"
                  :class="index < formData.subRecipes.length - 1 && 'border-b border-amber-500/10'"
                >
                  <span class="size-5 rounded-full bg-amber-500/10 flex items-center justify-center text-[10px] text-amber-600 dark:text-amber-400 font-bold tabular-nums">{{ index + 1 }}</span>

                  <!-- Recipe picker -->
                  <Popover :open="subRecipeOpen === index" @update:open="(v) => { subRecipeOpen = v ? index : null; subRecipeSearch = '' }">
                    <PopoverTrigger as-child>
                      <button
                        type="button"
                        class="inline-flex items-center justify-between rounded-md border border-input bg-background transition-colors hover:bg-accent w-full gap-1 h-8 text-xs px-2"
                      >
                        <span v-if="sr.recipeName" class="truncate flex items-center gap-1.5">
                          <Icon name="i-lucide-chef-hat" class="size-3 shrink-0 text-amber-500" />
                          <span class="font-medium">{{ sr.recipeName }}</span>
                        </span>
                        <span v-else class="text-muted-foreground">Select recipe...</span>
                        <Icon name="i-lucide-chevrons-up-down" class="size-3 shrink-0 opacity-50" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent class="w-[260px] p-0" align="start">
                      <div class="flex items-center border-b px-3 py-2">
                        <Icon name="i-lucide-search" class="size-3.5 text-muted-foreground mr-2 shrink-0" />
                        <input v-model="subRecipeSearch" class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder="Search recipes...">
                      </div>
                      <div class="max-h-[200px] overflow-y-auto p-1">
                        <button
                          v-for="r in availableSubRecipes"
                          :key="r._id"
                          type="button"
                          class="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-accent"
                          :class="sr.recipeName === r.recipeName ? 'bg-amber-500/10 font-medium' : ''"
                          @click="selectSubRecipe(index, r)"
                        >
                          <Icon :name="sr.recipeName === r.recipeName ? 'i-lucide-check' : 'i-lucide-chef-hat'" class="size-3 shrink-0" :class="sr.recipeName === r.recipeName ? 'text-amber-500' : 'text-muted-foreground'" />
                          <span class="truncate">{{ r.recipeName }}</span>
                        </button>
                        <p v-if="availableSubRecipes.length === 0" class="text-center py-3 text-xs text-muted-foreground">No recipes found</p>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Input v-model.number="sr.quantity" type="number" step="any" min="0" placeholder="Qty" class="h-8 text-xs" />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="size-6 text-destructive hover:text-destructive opacity-0 group-hover/sr:opacity-100 transition-opacity"
                    @click="removeSubRecipe(index)"
                  >
                    <Icon name="i-lucide-trash-2" class="size-3" />
                  </Button>
                </div>
              </div>

              <!-- Add Recipe Button placed below the table when rows exist -->
              <Button v-if="formData.subRecipes.length > 0" type="button" variant="outline" size="sm" class="w-full h-8 text-xs border-dashed border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 hover:border-solid mt-2 transition-all group" @click="addSubRecipe">
                <Icon name="i-lucide-plus" class="mr-1.5 size-3.5 text-amber-600 dark:text-amber-400" /> Add Recipe
              </Button>
            </div>
          </div>

          <!-- Tab: Notes & Method -->
          <div v-show="activeTab === 'notes'" class="space-y-4">
            <div class="space-y-2">
              <Label for="methodOfPrep">Method of Preparation</Label>
              <textarea
                id="methodOfPrep"
                v-model="formData.methodOfPreparation"
                rows="4"
                placeholder="1. Gather all ingredients and weight them out in mixing bowl and whisk together..."
                class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
              />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="chefNotes">Chef Notes</Label>
                <textarea
                  id="chefNotes"
                  v-model="formData.chefNotes"
                  rows="3"
                  placeholder="Any chef-specific notes..."
                  class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                />
              </div>
              <div class="space-y-2">
                <Label for="coolingProcedures">Cooling Procedures</Label>
                <textarea
                  id="coolingProcedures"
                  v-model="formData.coolingProcedures"
                  rows="3"
                  placeholder="Cooling procedure details..."
                  class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                />
              </div>
            </div>
            <div class="space-y-2">
              <Label for="chefLink">Chef Link</Label>
              <Input id="chefLink" v-model="formData.chefLink" placeholder="https://..." />
            </div>
            <div class="space-y-2">
              <Label for="additionalNotes">Additional Notes</Label>
              <textarea
                id="additionalNotes"
                v-model="formData.additionalNotes"
                rows="3"
                placeholder="Any additional notes..."
                class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
              />
            </div>
          </div>

          <DialogFooter class="flex sm:justify-between items-center w-full">
            <div class="flex items-center gap-2 text-xs text-muted-foreground mr-auto">
              <!-- Auto-save indicators only show in edit mode -->
              <template v-if="editingRecipe">
                <Icon v-if="isAutoSaving" name="i-lucide-loader-2" class="size-3.5 animate-spin text-primary" />
                <Icon v-else-if="autoSaveError" name="i-lucide-alert-circle" class="size-3.5 text-destructive" />
                <Icon v-else-if="lastSaved" name="i-lucide-check-circle-2" class="size-3.5 text-emerald-500" />
                
                <span v-if="isAutoSaving" class="text-primary font-medium">Saving changes...</span>
                <span v-else-if="autoSaveError" class="text-destructive font-medium">Failed to save</span>
                <span v-else-if="lastSaved">All changes saved</span>
              </template>
            </div>
            
            <div class="flex items-center gap-2">
              <Button v-if="editingRecipe" variant="outline" type="button" @click="showDialog = false">Done</Button>
              <template v-else>
                <Button variant="outline" type="button" @click="showDialog = false">Cancel</Button>
                <Button type="submit" :disabled="saving">
                  <Icon v-if="saving" name="i-lucide-loader-2" class="mr-1 size-4 animate-spin" />
                  Create Recipe
                </Button>
              </template>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- ═══ Delete Confirmation ═══ -->
    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Recipe?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete <strong>{{ deletingRecipe?.recipeName }}</strong> and all its ingredients. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="handleDelete">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
