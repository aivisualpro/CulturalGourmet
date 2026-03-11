<script setup lang="ts">
const { isAuthenticated, initAuth } = useAuth()
const authChecked = ref(false)

onMounted(() => {
  initAuth()
  authChecked.value = true
})
</script>

<template>
  <SidebarProvider>
    <template v-if="authChecked && isAuthenticated">
      <LayoutAppSidebar />
      <SidebarInset>
        <LayoutHeader />
        <div class="flex flex-col flex-1 overflow-y-auto h-[calc(100vh-var(--header-height))]">
          <div class="@container/main p-4 lg:p-6 grow">
            <slot />
          </div>
        </div>
      </SidebarInset>
    </template>

    <!-- Loading state while checking auth -->
    <template v-else-if="!authChecked">
      <div class="flex items-center justify-center min-h-screen w-full">
        <div class="flex flex-col items-center gap-4">
          <div class="size-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p class="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    </template>
  </SidebarProvider>
</template>
