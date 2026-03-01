<script setup lang="ts">
interface MediaItem { publicId: string; url: string; thumb: string; name: string; width?: number; height?: number }
const g = inject('gallery') as any
const { videos, selectMode, selected, deleting, toggleSelect, openVideo, askDelete } = g
</script>

<template>
  <div v-if="videos.length === 0" class="py-24 flex flex-col items-center gap-4 text-muted-foreground">
    <div class="size-20 rounded-2xl bg-muted flex items-center justify-center"><Icon name="i-lucide-video-off" class="size-10 opacity-30" /></div>
    <div class="text-center"><p class="text-sm font-medium">No videos yet</p><p class="text-xs opacity-60 mt-1">Upload videos using the button above</p></div>
  </div>

  <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    <div
      v-for="(item, idx) in videos"
      :key="item.publicId"
      :class="['group relative rounded-2xl overflow-hidden bg-black cursor-pointer ring-1 ring-white/5 transition-all duration-200', selected.has(item.publicId) ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'hover:ring-white/20']"
      @click="openVideo(item, idx)"
    >
      <img :src="item.thumb" :alt="item.name" class="w-full aspect-video object-cover opacity-90 group-hover:opacity-60 transition-opacity duration-300" loading="lazy" decoding="async">
      <div v-if="!selectMode" class="absolute inset-0 flex items-center justify-center">
        <div class="size-14 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center group-hover:bg-white/25 group-hover:scale-110 transition-all duration-300 shadow-xl">
          <Icon name="i-lucide-play" class="size-6 text-white fill-white ml-0.5" />
        </div>
      </div>
      <div class="absolute bottom-0 inset-x-0 px-3 py-2.5 bg-gradient-to-t from-black/80 to-transparent">
        <p class="text-white text-xs font-medium truncate">{{ item.name }}</p>
      </div>
      <div v-if="selectMode" class="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors" />
      <div v-if="selectMode" :class="['absolute top-2 left-2 size-6 rounded-full border-2 flex items-center justify-center shadow-sm', selected.has(item.publicId) ? 'bg-primary border-primary scale-110' : 'bg-black/50 border-white/80 backdrop-blur-sm']">
        <Icon v-if="selected.has(item.publicId)" name="i-lucide-check" class="size-3.5 text-primary-foreground" />
      </div>
      <button v-if="!selectMode" :class="['absolute top-2 right-2 size-7 rounded-full flex items-center justify-center transition-all backdrop-blur-sm shadow opacity-0 group-hover:opacity-100', deleting===item.publicId ? 'bg-red-600 opacity-100 animate-pulse' : 'bg-black/60 hover:bg-red-600']" title="Delete" @click="askDelete({ publicId: item.publicId, resourceType: 'video', name: item.name }, $event)">
        <Icon name="i-lucide-trash-2" class="size-3.5 text-white" />
      </button>
    </div>
  </div>
</template>
