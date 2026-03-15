<script setup lang="ts">
defineProps<{
  name: string
}>()
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <SidebarMenuButton size="lg" as-child>
        <NuxtLink to="/">
          <img
            src="/logo.png"
            :alt="name"
            class="h-8 w-auto object-contain"
          >
          <div class="grid flex-1 text-left text-sm leading-tight">
            <span class="truncate font-semibold">{{ name }}</span>
          </div>
        </NuxtLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
</template>

<style scoped>

</style>
