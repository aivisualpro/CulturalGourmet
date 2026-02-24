<script setup lang="ts">
import { toast } from 'vue-sonner'
import { HEADER_ACTIONS_ID } from '~/composables/usePageHeader'

const { setHeader } = usePageHeader()
setHeader({ title: 'Vendors', icon: 'i-lucide-truck' })

// ─── State ──────────────────────────────────────────────────
const vendors = ref<any[]>([])
const loading = ref(true)
const search = ref('')
const showDialog = ref(false)
const showDeleteDialog = ref(false)
const editingVendor = ref<any>(null)
const deletingVendor = ref<any>(null)
const saving = ref(false)

const formData = ref({
  vendorName: '',
})

// ─── Fetch ──────────────────────────────────────────────────
async function fetchVendors() {
  loading.value = true
  try {
    vendors.value = await $fetch('/api/vendors')
  }
  catch (err) {
    toast.error('Failed to load vendors')
  }
  finally {
    loading.value = false
  }
}

onMounted(fetchVendors)

// ─── Computed ───────────────────────────────────────────────
const filteredVendors = computed(() => {
  if (!search.value) return vendors.value
  const q = search.value.toLowerCase()
  return vendors.value.filter((v: any) =>
    v.vendorName?.toLowerCase().includes(q)
    || v.contacts?.some((c: any) =>
      c.contactPerson?.toLowerCase().includes(q)
      || c.emails?.some((e: string) => e.toLowerCase().includes(q)),
    ),
  )
})

// ─── CRUD ───────────────────────────────────────────────────
function openCreate() {
  editingVendor.value = null
  formData.value = { vendorName: '' }
  showDialog.value = true
}

function openEdit(vendor: any) {
  editingVendor.value = vendor
  formData.value = { vendorName: vendor.vendorName }
  showDialog.value = true
}

async function handleSave() {
  if (!formData.value.vendorName.trim()) {
    toast.error('Vendor name is required')
    return
  }

  saving.value = true
  try {
    if (editingVendor.value) {
      await $fetch(`/api/vendors/${editingVendor.value._id}`, {
        method: 'PUT',
        body: formData.value,
      })
      toast.success('Vendor updated')
    }
    else {
      await $fetch('/api/vendors', {
        method: 'POST',
        body: formData.value,
      })
      toast.success('Vendor created')
    }
    showDialog.value = false
    await fetchVendors()
  }
  catch (err) {
    toast.error('Failed to save vendor')
  }
  finally {
    saving.value = false
  }
}

function confirmDelete(vendor: any) {
  deletingVendor.value = vendor
  showDeleteDialog.value = true
}

async function handleDelete() {
  if (!deletingVendor.value) return
  try {
    await $fetch(`/api/vendors/${deletingVendor.value._id}`, { method: 'DELETE' })
    toast.success('Vendor deleted')
    showDeleteDialog.value = false
    deletingVendor.value = null
    await fetchVendors()
  }
  catch (err) {
    toast.error('Failed to delete vendor')
  }
}

async function handleReset() {
  search.value = ''
  await fetchVendors()
  toast.info('Data refreshed from database')
}
</script>

<template>
  <!-- Header Actions (teleported into main header) -->
  <Teleport :to="`#${HEADER_ACTIONS_ID}`">
    <div class="flex items-center gap-2">
      <div class="relative hidden sm:block">
        <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          v-model="search"
          placeholder="Search records..."
          class="pl-8 h-8 w-48 lg:w-64 text-xs"
        />
      </div>
      <p class="text-xs text-muted-foreground tabular-nums whitespace-nowrap hidden md:block">
        {{ filteredVendors.length }} record{{ filteredVendors.length !== 1 ? 's' : '' }}
      </p>
      <Button variant="ghost" size="sm" class="h-8 text-xs" @click="handleReset">
        <Icon name="i-lucide-rotate-ccw" class="mr-1 size-3.5" />
        Reset
      </Button>
      <Button size="sm" class="h-8 text-xs" @click="openCreate">
        <Icon name="i-lucide-plus" class="mr-1 size-3.5" />
        Add Vendor
      </Button>
    </div>
  </Teleport>

  <div class="w-full flex flex-col gap-6">
    <!-- Mobile Search -->
    <div class="sm:hidden relative">
      <Icon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input v-model="search" placeholder="Search records..." class="pl-9" />
    </div>

    <!-- Loading Skeleton -->
    <Card v-if="loading" class="p-6">
      <div class="space-y-4">
        <Skeleton class="h-10 w-full" />
        <Skeleton class="h-10 w-full" />
        <Skeleton class="h-10 w-full" />
        <Skeleton class="h-10 w-3/4" />
      </div>
    </Card>

    <!-- Table -->
    <Card v-else>
      <div class="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Contacts</TableHead>
              <TableHead>Created</TableHead>
              <TableHead class="w-[80px] text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="vendor in filteredVendors" :key="vendor._id" class="group">
              <TableCell>
                <div class="flex items-center gap-3">
                  <Avatar class="size-8 border bg-primary/10">
                    <AvatarFallback class="text-xs font-semibold text-primary">
                      {{ vendor.vendorName?.charAt(0)?.toUpperCase() || '?' }}
                    </AvatarFallback>
                  </Avatar>
                  <span class="font-medium">{{ vendor.vendorName }}</span>
                </div>
              </TableCell>
              <TableCell>
                <div v-if="vendor.contacts?.length" class="flex items-center gap-1.5">
                  <Badge variant="secondary" class="text-xs font-normal">
                    {{ vendor.contacts.length }} contact{{ vendor.contacts.length !== 1 ? 's' : '' }}
                  </Badge>
                </div>
                <span v-else class="text-muted-foreground text-sm">—</span>
              </TableCell>
              <TableCell>
                <span class="text-muted-foreground text-sm">
                  {{ new Date(vendor.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) }}
                </span>
              </TableCell>
              <TableCell class="text-right">
                <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" class="size-8" @click="openEdit(vendor)">
                    <Icon name="i-lucide-pencil" class="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" class="size-8 text-destructive hover:text-destructive" @click="confirmDelete(vendor)">
                    <Icon name="i-lucide-trash-2" class="size-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>

            <!-- Empty State -->
            <TableRow v-if="filteredVendors.length === 0">
              <TableCell :colspan="4" class="h-32 text-center">
                <div class="flex flex-col items-center gap-2 text-muted-foreground">
                  <Icon name="i-lucide-inbox" class="size-8" />
                  <p>No vendors found</p>
                  <Button size="sm" variant="outline" @click="openCreate">
                    <Icon name="i-lucide-plus" class="mr-1 size-4" />
                    Add Vendor
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </Card>

    <!-- Create/Edit Dialog -->
    <Dialog v-model:open="showDialog">
      <DialogContent class="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{{ editingVendor ? 'Edit' : 'New' }} Vendor</DialogTitle>
          <DialogDescription class="sr-only">
            {{ editingVendor ? 'Edit' : 'Create' }} a vendor record
          </DialogDescription>
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="handleSave">
          <div class="space-y-2">
            <Label for="vendorName">Vendor Name</Label>
            <Input
              id="vendorName"
              v-model="formData.vendorName"
              placeholder="e.g. Restaurant Depot"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" @click="showDialog = false">
              Cancel
            </Button>
            <Button type="submit" :disabled="saving">
              <Icon v-if="saving" name="i-lucide-loader-2" class="mr-1 size-4 animate-spin" />
              {{ editingVendor ? 'Update' : 'Create' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Delete Confirmation -->
    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Vendor?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete <strong>{{ deletingVendor?.vendorName }}</strong> and all its contacts. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="handleDelete">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
