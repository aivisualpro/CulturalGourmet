<script setup lang="ts">
defineProps<{
  reverse?: boolean
}>()
</script>

<template>
  <div
    class="relative flex items-center justify-center px-4 h-dvh lg:max-w-none lg:px-0"
    :class="{ 'flex-row-reverse': reverse }"
  >
    <div class="relative hidden h-full flex-1 flex-col bg-muted p-10 text-white lg:flex dark:border-r">
      <div class="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900" />
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(102,126,234,0.12),transparent_60%)]" />
      <div class="relative z-20 flex items-center text-lg font-medium">
        <img
          src="/the culture gourmet logo.png"
          alt="The Culture Gourmet"
          class="mr-3 h-8 w-8 rounded-lg"
        >
        The Culture Gourmet
      </div>
      <div class="relative z-20 mt-auto">
        <blockquote class="space-y-2">
          <p class="text-lg">
            &ldquo;Where culinary artistry meets cultural excellence — managing our gourmet operations has never been this elegant.&rdquo;
          </p>
          <footer class="text-sm text-zinc-400">
            The Culture Gourmet Team
          </footer>
        </blockquote>
      </div>
    </div>
    <div class="mx-auto flex-1 lg:p-8">
      <slot />
    </div>
  </div>
</template>
