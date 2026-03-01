<script setup lang="ts">
import type { NavMenu } from '~/types/nav'
import { navMenu } from '@/constants/menus'

const { metaSymbol } = useShortcuts()

const openCommand = ref(false)
const router = useRouter()

defineShortcuts({
  Meta_K: () => openCommand.value = true,
})

// Flatten all nav items across every section
const allNavItems = computed(() =>
  navMenu.flatMap((nav: NavMenu) =>
    nav.items.map((item: any) => ({
      title: item.title as string,
      link: item.link as string,
      icon: item.icon as string | undefined,
      section: nav.heading,
    })),
  ),
)

// Group items by their section heading
const groupedNavItems = computed(() => {
  const groups: Record<string, typeof allNavItems.value> = {}
  for (const item of allNavItems.value) {
    if (!groups[item.section]) groups[item.section] = []
    ;(groups[item.section] as typeof allNavItems.value).push(item)
  }
  return groups
})

function handleSelectLink(link: string) {
  router.push(link)
  openCommand.value = false
}
</script>

<template>
  <SidebarMenuButton as-child tooltip="Search">
    <Button variant="outline" size="sm" class="text-xs" @click="openCommand = !openCommand">
      <Icon name="i-lucide-search" />
      <span class="font-normal group-data-[collapsible=icon]:hidden">Search</span>
      <div class="ml-auto flex items-center space-x-0.5 group-data-[collapsible=icon]:hidden">
        <Kbd>{{ metaSymbol }}</Kbd>
        <Kbd>K</Kbd>
      </div>
    </Button>
  </SidebarMenuButton>

  <CommandDialog v-model:open="openCommand">
    <CommandInput placeholder="Search menu..." />
    <CommandList>
      <CommandEmpty>No results found.</CommandEmpty>
      <template v-for="(items, heading) in groupedNavItems" :key="heading">
        <CommandGroup :heading="heading">
          <CommandItem
            v-for="item in items"
            :key="item.link"
            :value="item.title"
            class="gap-2"
            @select="handleSelectLink(item.link)"
          >
            <Icon v-if="item.icon" :name="item.icon" class="size-4 text-muted-foreground" />
            {{ item.title }}
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
      </template>
    </CommandList>
  </CommandDialog>
</template>

<style scoped>

</style>
