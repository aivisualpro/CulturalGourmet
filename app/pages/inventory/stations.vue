<script setup lang="ts">
import { toast } from 'vue-sonner'
import { HEADER_ACTIONS_ID } from '~/composables/usePageHeader'

const { setHeader } = usePageHeader()
setHeader({ title: 'Stations', icon: 'i-lucide-map-pin' })

const locations = ref<any[]>([])
const loading = ref(true)
const search = ref('')
const showDialog = ref(false)
const showDeleteDialog = ref(false)
const editingLoc = ref<any>(null)
const deletingLoc = ref<any>(null)
const saving = ref(false)

const formData = ref({ name: '', address: '', phone: '', notes: '' })

async function fetchLocations() {
  loading.value = true
  try { locations.value = await $fetch('/api/locations') }
  catch { toast.error('Failed to load stations') }
  finally { loading.value = false }
}

onMounted(fetchLocations)

const filtered = computed(() => {
  if (!search.value) return locations.value
  const q = search.value.toLowerCase()
  return locations.value.filter((l: any) =>
    l.name?.toLowerCase().includes(q)
    || l.address?.toLowerCase().includes(q)
    || l.phone?.toLowerCase().includes(q),
  )
})

function openCreate() {
  editingLoc.value = null
  formData.value = { name: '', address: '', phone: '', notes: '' }
  showDialog.value = true
}

function openEdit(loc: any) {
  editingLoc.value = loc
  formData.value = { name: loc.name || '', address: loc.address || '', phone: loc.phone || '', notes: loc.notes || '' }
  showDialog.value = true
}

async function handleSave() {
  if (!formData.value.name.trim()) { toast.error('Station name is required'); return }
  saving.value = true
  try {
    if (editingLoc.value) {
      await $fetch(`/api/locations/${editingLoc.value._id}`, { method: 'PUT', body: formData.value })
      toast.success('Station updated')
    }
    else {
      await $fetch('/api/locations', { method: 'POST', body: formData.value })
      toast.success('Station created')
    }
    showDialog.value = false
    await fetchLocations()
  }
  catch { toast.error('Failed to save station') }
  finally { saving.value = false }
}

function confirmDelete(loc: any) { deletingLoc.value = loc; showDeleteDialog.value = true }

async function handleDelete() {
  if (!deletingLoc.value) return
  try {
    await $fetch(`/api/locations/${deletingLoc.value._id}`, { method: 'DELETE' })
    toast.success('Station deleted')
    showDeleteDialog.value = false
    deletingLoc.value = null
    await fetchLocations()
  }
  catch { toast.error('Failed to delete station') }
}

async function handleReset() { search.value = ''; await fetchLocations(); toast.info('Refreshed') }
</script>

<template>
  <Teleport :to="`#${HEADER_ACTIONS_ID}`">
    <div class="flex items-center gap-2">
      <div class="relative hidden sm:block">
        <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input v-model="search" placeholder="Search stations..." class="pl-8 h-8 w-48 lg:w-64 text-xs" />
      </div>
      <p class="text-xs text-muted-foreground tabular-nums whitespace-nowrap hidden md:block">
        {{ filtered.length }} record{{ filtered.length !== 1 ? 's' : '' }}
      </p>
      <Button variant="ghost" size="sm" class="h-8 text-xs" @click="handleReset">
        <Icon name="i-lucide-rotate-ccw" class="mr-1 size-3.5" />Reset
      </Button>
      <Button size="sm" class="h-8 text-xs" @click="openCreate">
        <Icon name="i-lucide-plus" class="mr-1 size-3.5" />Add Station
      </Button>
    </div>
  </Teleport>

  <div class="w-full flex flex-col gap-6">
    <div class="sm:hidden relative">
      <Icon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input v-model="search" placeholder="Search stations..." class="pl-9" />
    </div>

    <Card v-if="loading" class="p-6">
      <div class="space-y-4"><Skeleton class="h-10 w-full" /><Skeleton class="h-10 w-full" /><Skeleton class="h-10 w-3/4" /></div>
    </Card>

    <Card v-else>
      <div class="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Station</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Created</TableHead>
              <TableHead class="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="loc in filtered" :key="loc._id" class="group">
              <TableCell>
                <div class="flex items-center gap-3">
                  <Avatar class="size-8 border bg-emerald-500/10">
                    <AvatarFallback class="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {{ loc.name?.charAt(0)?.toUpperCase() || '?' }}
                    </AvatarFallback>
                  </Avatar>
                  <span class="font-medium">{{ loc.name }}</span>
                </div>
              </TableCell>
              <TableCell>
                <span v-if="loc.address" class="text-sm max-w-[200px] truncate block">{{ loc.address }}</span>
                <span v-else class="text-muted-foreground text-sm">—</span>
              </TableCell>
              <TableCell>
                <span v-if="loc.phone" class="text-sm">{{ loc.phone }}</span>
                <span v-else class="text-muted-foreground text-sm">—</span>
              </TableCell>
              <TableCell>
                <span v-if="loc.notes" class="text-sm max-w-[200px] truncate block">{{ loc.notes }}</span>
                <span v-else class="text-muted-foreground text-sm">—</span>
              </TableCell>
              <TableCell>
                <span class="text-muted-foreground text-sm">
                  {{ new Date(loc.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) }}
                </span>
              </TableCell>
              <TableCell class="text-right">
                <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" class="size-8" @click="openEdit(loc)"><Icon name="i-lucide-pencil" class="size-3.5" /></Button>
                  <Button variant="ghost" size="icon" class="size-8 text-destructive hover:text-destructive" @click="confirmDelete(loc)"><Icon name="i-lucide-trash-2" class="size-3.5" /></Button>
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-if="filtered.length === 0">
              <TableCell :colspan="6" class="h-32 text-center">
                <div class="flex flex-col items-center gap-2 text-muted-foreground">
                  <Icon name="i-lucide-inbox" class="size-8" /><p>No stations found</p>
                  <Button size="sm" variant="outline" @click="openCreate"><Icon name="i-lucide-plus" class="mr-1 size-4" />Add Station</Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </Card>

    <Dialog v-model:open="showDialog">
      <DialogContent class="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{{ editingLoc ? 'Edit' : 'New' }} Station</DialogTitle>
          <DialogDescription class="sr-only">{{ editingLoc ? 'Edit' : 'Create' }} a station</DialogDescription>
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="handleSave">
          <div class="space-y-2"><Label for="locName">Name <span class="text-destructive">*</span></Label><Input id="locName" v-model="formData.name" placeholder="e.g. Main Kitchen" /></div>
          <div class="space-y-2"><Label for="locAddress">Address</Label><Input id="locAddress" v-model="formData.address" placeholder="e.g. 123 Main St" /></div>
          <div class="space-y-2"><Label for="locPhone">Phone</Label><Input id="locPhone" v-model="formData.phone" placeholder="e.g. (555) 123-4567" /></div>
          <div class="space-y-2"><Label for="locNotes">Notes</Label><Textarea id="locNotes" v-model="formData.notes" placeholder="Additional notes..." rows="2" /></div>
          <DialogFooter>
            <Button variant="outline" type="button" @click="showDialog = false">Cancel</Button>
            <Button type="submit" :disabled="saving">
              <Icon v-if="saving" name="i-lucide-loader-2" class="mr-1 size-4 animate-spin" />{{ editingLoc ? 'Update' : 'Create' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Station?</AlertDialogTitle>
          <AlertDialogDescription>This will permanently delete <strong>{{ deletingLoc?.name }}</strong>. This action cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="handleDelete">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
