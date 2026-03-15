<script setup lang="ts">
import { toast } from 'vue-sonner'
import { HEADER_ACTIONS_ID } from '~/composables/usePageHeader'

const { setHeader } = usePageHeader()
setHeader({ title: 'Master Prep List', icon: 'i-lucide-clipboard-list' })

// ─── Global Data Store ──────────────────────────────────────
const { prepList: prepItems, recipes, ready: storeReady, fetchPrepList } = useDataStore()
const loading = computed(() => !storeReady.value)
const search = ref('')
const showDialog = ref(false)
const showDeleteDialog = ref(false)
const editingItem = ref<any>(null)
const deletingItem = ref<any>(null)
const saving = ref(false)

const defaultForm = () => ({
  prepName: '',
  recipe: '',
  batchQty: undefined as number | undefined,
  yieldQty: undefined as number | undefined,
})

const formData = ref(defaultForm())

const _fetch = $fetch as typeof $fetch<any, any>

async function fetchPrepItems() {
  await fetchPrepList()
}

// ─── Computed ───────────────────────────────────────────────
const filtered = computed(() => {
  if (!search.value) return prepItems.value
  const q = search.value.toLowerCase()
  return prepItems.value.filter((p: any) =>
    p.prepName?.toLowerCase().includes(q)
    || p.recipe?.toLowerCase().includes(q),
  )
})

// Recipe search for dropdown
const recipeOpen = ref(false)
const recipeSearch = ref('')
const filteredRecipes = computed(() => {
  if (!recipeSearch.value) return recipes.value
  const q = recipeSearch.value.toLowerCase()
  return recipes.value.filter((r: any) => r.recipeName?.toLowerCase().includes(q))
})

function selectRecipe(recipe: any) {
  formData.value.recipe = recipe.recipeName
  recipeOpen.value = false
  recipeSearch.value = ''
}

// ─── CRUD ───────────────────────────────────────────────────
function openCreate() {
  editingItem.value = null
  formData.value = defaultForm()
  showDialog.value = true
}

function openEdit(item: any) {
  editingItem.value = item
  formData.value = {
    prepName: item.prepName || '',
    recipe: item.recipe || '',
    batchQty: item.batchQty ?? undefined,
    yieldQty: item.yieldQty ?? undefined,
  }
  showDialog.value = true
}

async function handleSave() {
  if (!formData.value.prepName.trim()) { toast.error('Prep name is required'); return }
  saving.value = true

  try {
    if (editingItem.value) {
      await _fetch(`/api/prep-list/${editingItem.value._id}`, { method: 'PUT', body: formData.value })
      toast.success('Prep item updated')
    }
    else {
      await _fetch('/api/prep-list', { method: 'POST', body: formData.value })
      toast.success('Prep item created')
    }
    showDialog.value = false
    await fetchPrepItems()
  }
  catch { toast.error('Failed to save prep item') }
  finally { saving.value = false }
}

function confirmDelete(item: any) { deletingItem.value = item; showDeleteDialog.value = true }

async function handleDelete() {
  if (!deletingItem.value) return
  try {
    await _fetch(`/api/prep-list/${deletingItem.value._id}`, { method: 'DELETE' })
    toast.success('Prep item deleted')
    showDeleteDialog.value = false
    deletingItem.value = null
    await fetchPrepItems()
  }
  catch { toast.error('Failed to delete prep item') }
}

</script>

<template>
  <ClientOnly>
    <Teleport :to="`#${HEADER_ACTIONS_ID}`" defer>
    <div class="flex items-center gap-2">
      <div class="relative hidden sm:block">
        <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input v-model="search" placeholder="Search prep list..." class="pl-8 h-8 w-48 lg:w-64 text-xs" />
      </div>
      <p class="text-xs text-muted-foreground tabular-nums whitespace-nowrap hidden md:block">
        {{ filtered.length }} item{{ filtered.length !== 1 ? 's' : '' }}
      </p>

      <Button size="sm" class="h-8 text-xs" @click="openCreate">
        <Icon name="i-lucide-plus" class="mr-1 size-3.5" />Add Prep Item
      </Button>
    </div>
    </Teleport>
  </ClientOnly>

  <div class="w-full flex flex-col gap-6">
    <!-- Mobile Search -->
    <div class="sm:hidden relative">
      <Icon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input v-model="search" placeholder="Search prep list..." class="pl-9" />
    </div>

    <!-- Loading -->
    <Card v-if="loading" class="p-6">
      <div class="space-y-4"><Skeleton class="h-10 w-full" /><Skeleton class="h-10 w-full" /><Skeleton class="h-10 w-full" /><Skeleton class="h-10 w-3/4" /></div>
    </Card>

    <!-- Table -->
    <Card v-else-if="filtered.length > 0">
      <div class="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="text-xs font-semibold w-[50px]">#</TableHead>
              <TableHead class="text-xs font-semibold">Prep Name</TableHead>
              <TableHead class="text-xs font-semibold">Recipe</TableHead>
              <TableHead class="text-xs font-semibold text-right">Batch Qty</TableHead>
              <TableHead class="text-xs font-semibold text-right">Yield Qty</TableHead>
              <TableHead class="text-xs font-semibold text-right w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="(item, idx) in filtered"
              :key="item._id"
              class="group cursor-pointer hover:bg-muted/30 transition-colors"
            >
              <TableCell class="text-xs text-muted-foreground tabular-nums">{{ idx + 1 }}</TableCell>
              <TableCell class="font-medium">{{ item.prepName }}</TableCell>
              <TableCell>
                <span v-if="item.recipe" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-foreground">
                  <Icon name="i-lucide-chef-hat" class="size-3 text-primary" />
                  {{ item.recipe }}
                </span>
                <span v-else class="text-xs text-muted-foreground">—</span>
              </TableCell>
              <TableCell class="text-right tabular-nums">{{ item.batchQty ?? '—' }}</TableCell>
              <TableCell class="text-right tabular-nums">{{ item.yieldQty ?? '—' }}</TableCell>
              <TableCell class="text-right">
                <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" class="size-7" @click.stop="openEdit(item)">
                    <Icon name="i-lucide-pencil" class="size-3" />
                  </Button>
                  <Button variant="ghost" size="icon" class="size-7 text-destructive hover:text-destructive" @click.stop="confirmDelete(item)">
                    <Icon name="i-lucide-trash-2" class="size-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </Card>

    <!-- Empty State -->
    <Card v-else class="p-12">
      <div class="flex flex-col items-center gap-4 text-center">
        <div class="size-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Icon name="i-lucide-clipboard-list" class="size-8 text-primary" />
        </div>
        <div>
          <h3 class="text-lg font-semibold">No prep items yet</h3>
          <p class="text-sm text-muted-foreground mt-1">Add your first prep item to build your master prep list.</p>
        </div>
        <Button @click="openCreate">
          <Icon name="i-lucide-plus" class="mr-1.5 size-4" />Add Prep Item
        </Button>
      </div>
    </Card>

    <!-- ═══ Create/Edit Dialog ═══ -->
    <Dialog v-model:open="showDialog">
      <DialogContent class="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{{ editingItem ? 'Edit' : 'New' }} Prep Item</DialogTitle>
          <DialogDescription class="sr-only">{{ editingItem ? 'Edit' : 'Create' }} a prep item</DialogDescription>
        </DialogHeader>
        <form class="space-y-5" @submit.prevent="handleSave">
          <!-- Prep Name -->
          <div class="space-y-2">
            <Label for="prepName">Prep Name <span class="text-destructive">*</span></Label>
            <Input id="prepName" v-model="formData.prepName" placeholder="e.g. Coleslaw Mix" />
          </div>

          <!-- Recipe dropdown -->
          <div class="space-y-2">
            <Label>Recipe</Label>
            <Popover v-model:open="recipeOpen">
              <PopoverTrigger as-child>
                <button
                  type="button"
                  class="inline-flex items-center justify-between rounded-md border border-input bg-background ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full gap-1 h-9 text-sm px-3"
                >
                  <span v-if="formData.recipe" class="truncate flex items-center gap-1.5">
                    <Icon name="i-lucide-chef-hat" class="size-3.5 shrink-0 text-primary/60" />
                    <span class="font-medium">{{ formData.recipe }}</span>
                  </span>
                  <span v-else class="text-muted-foreground truncate">Select recipe...</span>
                  <Icon name="i-lucide-chevrons-up-down" class="size-3 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent class="w-[280px] p-0" align="start">
                <div class="flex items-center border-b px-3 py-2">
                  <Icon name="i-lucide-search" class="size-3.5 text-muted-foreground mr-2 shrink-0" />
                  <input v-model="recipeSearch" class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder="Search recipes...">
                </div>
                <div class="max-h-[220px] overflow-y-auto p-1">
                  <button
                    v-for="recipe in filteredRecipes"
                    :key="recipe._id"
                    type="button"
                    class="w-full flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent"
                    :class="formData.recipe === recipe.recipeName ? 'bg-primary/5 text-primary font-medium' : ''"
                    @click="selectRecipe(recipe)"
                  >
                    <Icon
                      :name="formData.recipe === recipe.recipeName ? 'i-lucide-check' : 'i-lucide-chef-hat'"
                      class="size-3.5 shrink-0"
                      :class="formData.recipe === recipe.recipeName ? 'text-primary' : 'text-muted-foreground'"
                    />
                    <div class="flex-1 text-left">
                      <p class="truncate">{{ recipe.recipeName }}</p>
                      <p v-if="recipe.ingredients?.length" class="text-[10px] text-muted-foreground">
                        {{ recipe.ingredients.length }} ingredient{{ recipe.ingredients.length !== 1 ? 's' : '' }}
                      </p>
                    </div>
                  </button>
                  <div v-if="filteredRecipes.length === 0" class="text-center py-4 text-xs text-muted-foreground">
                    <Icon name="i-lucide-chef-hat" class="size-5 mx-auto mb-1.5 opacity-50" />
                    <p>No recipes found</p>
                  </div>
                </div>
                <div v-if="formData.recipe" class="border-t p-1">
                  <button
                    type="button"
                    class="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    @click="formData.recipe = ''; recipeOpen = false"
                  >
                    <Icon name="i-lucide-x" class="size-3" /> Clear
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <!-- Batch Qty + Yield Qty -->
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="batchQty">Batch Qty</Label>
              <Input id="batchQty" v-model.number="formData.batchQty" type="number" step="any" placeholder="e.g. 10" />
            </div>
            <div class="space-y-2">
              <Label for="yieldQty">Yield Qty</Label>
              <Input id="yieldQty" v-model.number="formData.yieldQty" type="number" step="any" placeholder="e.g. 8" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" @click="showDialog = false">Cancel</Button>
            <Button type="submit" :disabled="saving">
              <Icon v-if="saving" name="i-lucide-loader-2" class="mr-1 size-4 animate-spin" />
              {{ editingItem ? 'Update' : 'Create' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- ═══ Delete Confirmation ═══ -->
    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Prep Item?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete <strong>{{ deletingItem?.prepName }}</strong>. This action cannot be undone.
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
