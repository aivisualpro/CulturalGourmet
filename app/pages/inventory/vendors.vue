<script setup lang="ts">
import { toast } from 'vue-sonner'
import { Plus, Trash2, UserPlus } from 'lucide-vue-next'
import { HEADER_ACTIONS_ID } from '~/composables/usePageHeader'

const { setHeader } = usePageHeader()
setHeader({ title: 'Vendors', icon: 'i-lucide-truck' })

// ─── Global Data Store ──────────────────────────────────────
const store = useDataStore()
const vendors = computed(() => store.vendors.value)
const loading = computed(() => !store.ready.value)
const search = ref('')
const showDialog = ref(false)
const showDeleteDialog = ref(false)
const editingVendor = ref<any>(null)
const deletingVendor = ref<any>(null)
const saving = ref(false)

const formData = ref({
  vendorName: '',
  address: '',
  phone: '',
  email: '',
  contacts: [] as { name: string, email: string, phone: string }[],
})

// ─── Refresh from store ─────────────────────────────────────
async function fetchVendors() {
  await store.fetchVendors()
}

// ─── Computed ───────────────────────────────────────────────
const filteredVendors = computed(() => {
  if (!search.value) return vendors.value
  const q = search.value.toLowerCase()
  return vendors.value.filter((v: any) =>
    v.vendorName?.toLowerCase().includes(q)
    || v.email?.toLowerCase().includes(q)
    || v.phone?.toLowerCase().includes(q)
    || v.address?.toLowerCase().includes(q)
    || v.contacts?.some((c: any) =>
      c.name?.toLowerCase().includes(q)
      || c.email?.toLowerCase().includes(q)
      || c.phone?.toLowerCase().includes(q),
    ),
  )
})

// ─── Contacts ───────────────────────────────────────────────
function addContact() {
  formData.value.contacts.push({ name: '', email: '', phone: '' })
}

function removeContact(index: number) {
  formData.value.contacts.splice(index, 1)
}

// ─── CRUD ───────────────────────────────────────────────────
function openCreate() {
  editingVendor.value = null
  formData.value = {
    vendorName: '',
    address: '',
    phone: '',
    email: '',
    contacts: [],
  }
  showDialog.value = true
}

function openEdit(vendor: any) {
  editingVendor.value = vendor
  formData.value = {
    vendorName: vendor.vendorName || '',
    address: vendor.address || '',
    phone: vendor.phone || '',
    email: vendor.email || '',
    contacts: (vendor.contacts || []).map((c: any) => ({
      name: c.name || c.contactPerson || '',
      email: c.email || (c.emails?.[0]) || '',
      phone: c.phone || (c.phones?.[0]) || '',
    })),
  }
  showDialog.value = true
}

async function handleSave() {
  if (!formData.value.vendorName.trim()) {
    toast.error('Vendor name is required')
    return
  }

  // Filter blank contacts
  const payload = {
    ...formData.value,
    contacts: formData.value.contacts.filter(c => c.name.trim()),
  }

  saving.value = true
  try {
    if (editingVendor.value) {
      await $fetch(`/api/vendors/${editingVendor.value._id}`, {
        method: 'PUT',
        body: payload,
      })
      toast.success('Vendor updated')
    }
    else {
      await $fetch('/api/vendors', {
        method: 'POST',
        body: payload,
      })
      toast.success('Vendor created')
    }
    showDialog.value = false
    await fetchVendors()
  }
  catch {
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
  catch {
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
          placeholder="Search vendors..."
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
      <Input v-model="search" placeholder="Search vendors..." class="pl-9" />
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
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Address</TableHead>
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
                <span v-if="vendor.email" class="text-sm">{{ vendor.email }}</span>
                <span v-else class="text-muted-foreground text-sm">—</span>
              </TableCell>
              <TableCell>
                <span v-if="vendor.phone" class="text-sm">{{ vendor.phone }}</span>
                <span v-else class="text-muted-foreground text-sm">—</span>
              </TableCell>
              <TableCell>
                <span v-if="vendor.address" class="text-sm max-w-[200px] truncate block">{{ vendor.address }}</span>
                <span v-else class="text-muted-foreground text-sm">—</span>
              </TableCell>
              <TableCell>
                <div v-if="vendor.contacts?.length">
                  <Popover>
                    <PopoverTrigger as-child>
                      <Button variant="outline" size="sm" class="h-7 text-xs gap-1.5">
                        <Icon name="i-lucide-users" class="size-3" />
                        {{ vendor.contacts.length }} contact{{ vendor.contacts.length !== 1 ? 's' : '' }}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent class="w-72 p-0" align="start">
                      <div class="px-3 py-2.5 border-b">
                        <p class="text-xs font-semibold">Contacts</p>
                      </div>
                      <div class="divide-y max-h-48 overflow-y-auto">
                        <div v-for="(contact, ci) in vendor.contacts" :key="ci" class="px-3 py-2.5">
                          <p class="text-sm font-medium">{{ contact.name || contact.contactPerson || '—' }}</p>
                          <p v-if="contact.email || contact.emails?.[0]" class="text-xs text-muted-foreground mt-0.5">
                            <Icon name="i-lucide-mail" class="inline-block size-3 mr-1 -mt-px" />{{ contact.email || contact.emails?.[0] }}
                          </p>
                          <p v-if="contact.phone || contact.phones?.[0]" class="text-xs text-muted-foreground mt-0.5">
                            <Icon name="i-lucide-phone" class="inline-block size-3 mr-1 -mt-px" />{{ contact.phone || contact.phones?.[0] }}
                          </p>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
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
              <TableCell :colspan="7" class="h-32 text-center">
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
      <DialogContent class="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ editingVendor ? 'Edit' : 'New' }} Vendor</DialogTitle>
          <DialogDescription class="sr-only">
            {{ editingVendor ? 'Edit' : 'Create' }} a vendor record
          </DialogDescription>
        </DialogHeader>
        <form class="space-y-5" @submit.prevent="handleSave">
          <!-- Vendor Info -->
          <div class="space-y-4">
            <div class="space-y-2">
              <Label for="vendorName">Vendor Name <span class="text-destructive">*</span></Label>
              <Input
                id="vendorName"
                v-model="formData.vendorName"
                placeholder="e.g. Restaurant Depot"
              />
            </div>
            <div class="space-y-2">
              <Label for="vendorEmail">Email</Label>
              <Input
                id="vendorEmail"
                v-model="formData.email"
                type="email"
                placeholder="e.g. info@vendor.com"
              />
            </div>
            <div class="space-y-2">
              <Label for="vendorPhone">Phone</Label>
              <Input
                id="vendorPhone"
                v-model="formData.phone"
                placeholder="e.g. (555) 123-4567"
              />
            </div>
            <div class="space-y-2">
              <Label for="vendorAddress">Address</Label>
              <Input
                id="vendorAddress"
                v-model="formData.address"
                placeholder="e.g. 123 Main St, New York, NY 10001"
              />
            </div>
          </div>

          <!-- Contacts Section -->
          <Separator />
          <div>
            <div class="flex items-center justify-between mb-3">
              <Label class="text-sm font-semibold">Contacts</Label>
              <Button type="button" variant="outline" size="sm" class="h-7 text-xs gap-1.5" @click="addContact">
                <UserPlus class="w-3.5 h-3.5" />
                Add Contact
              </Button>
            </div>

            <div v-if="formData.contacts.length === 0" class="text-center py-6 border border-dashed rounded-lg">
              <p class="text-sm text-muted-foreground">No contacts added yet</p>
              <Button type="button" variant="ghost" size="sm" class="mt-2 text-xs" @click="addContact">
                <Plus class="w-3.5 h-3.5 mr-1" />
                Add first contact
              </Button>
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="(contact, index) in formData.contacts"
                :key="index"
                class="p-3 rounded-lg border bg-muted/30 space-y-3 relative"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-muted-foreground">Contact {{ index + 1 }}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="size-6 text-destructive hover:text-destructive"
                    @click="removeContact(index)"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div class="space-y-1">
                    <Label class="text-xs">Name <span class="text-destructive">*</span></Label>
                    <Input
                      v-model="contact.name"
                      placeholder="Contact name"
                      class="h-8 text-sm"
                    />
                  </div>
                  <div class="space-y-1">
                    <Label class="text-xs">Email</Label>
                    <Input
                      v-model="contact.email"
                      type="email"
                      placeholder="Email"
                      class="h-8 text-sm"
                    />
                  </div>
                  <div class="space-y-1">
                    <Label class="text-xs">Phone</Label>
                    <Input
                      v-model="contact.phone"
                      placeholder="Phone"
                      class="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
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
