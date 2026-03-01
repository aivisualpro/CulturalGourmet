<script setup lang="ts">
defineProps<{
  user: {
    name: string
    email: string
    avatar: string
  }
}>()
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <SidebarMenuButton size="lg" class="cursor-default hover:bg-transparent">
        <Avatar class="h-8 w-8 rounded-lg">
          <AvatarImage :src="user.avatar" :alt="user.name" />
          <AvatarFallback class="rounded-lg">
            {{ user.name.split(' ').map((n) => n[0]).join('') }}
          </AvatarFallback>
        </Avatar>
        <span class="truncate font-semibold text-sm">{{ user.name }}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
</template>

