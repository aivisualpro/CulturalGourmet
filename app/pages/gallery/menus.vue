<script setup lang="ts">
interface PdfItem { publicId: string; url: string; name: string; resourceType: 'image' | 'raw'; thumb?: string }
const g = inject('gallery') as any
const { pdfs, selectMode, selected, deleting, moving, toggleSelect, askDelete, askMove } = g
</script>

<template>
  <div v-if="pdfs.length === 0" class="py-24 flex flex-col items-center gap-4 text-muted-foreground">
    <div class="size-20 rounded-2xl bg-muted flex items-center justify-center"><Icon name="i-lucide-file-x" class="size-10 opacity-30" /></div>
    <div class="text-center"><p class="text-sm font-medium">No menus yet</p><p class="text-xs opacity-60 mt-1">Upload PDF menus or menu photo scans above</p></div>
  </div>

  <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    <div
      v-for="item in pdfs"
      :key="item.publicId"
      :class="['group relative flex flex-col rounded-2xl border bg-card overflow-hidden transition-all duration-300', selectMode ? 'cursor-pointer' : 'hover:shadow-lg hover:border-primary/30', selected.has(item.publicId) ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : '']"
      @click="selectMode && toggleSelect(item.publicId)"
    >
      <!-- Preview -->
      <div class="relative aspect-[4/3] overflow-hidden">
        <!-- Image menu scan -->
        <template v-if="item.resourceType === 'image' && item.thumb">
          <img :src="item.thumb" :alt="item.name" class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" loading="lazy">
          <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <a v-if="!selectMode" :href="item.url" target="_blank" rel="noopener" class="absolute inset-0 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
            <span class="text-xs font-semibold text-white bg-black/50 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5">View full size ↗</span>
          </a>
          <span class="absolute top-2 left-2 text-[9px] font-mono uppercase tracking-widest text-white/80 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full">Photo</span>
        </template>
        <!-- PDF -->
        <template v-else>
          <div class="absolute inset-0 bg-gradient-to-br from-red-950/20 via-orange-950/15 to-amber-950/20 flex items-center justify-center">
            <div class="absolute inset-0 opacity-[0.06]" style="background-image:repeating-linear-gradient(45deg,currentColor 0,currentColor 1px,transparent 0,transparent 50%);background-size:10px 10px;" />
            <div class="relative z-10 flex flex-col items-center gap-3">
              <div class="size-16 rounded-2xl bg-red-500/15 border border-red-400/25 flex items-center justify-center group-hover:scale-105 transition-transform duration-300"><Icon name="i-lucide-file-text" class="size-8 text-red-400" /></div>
              <span class="text-[10px] font-mono uppercase tracking-widest text-red-400/70 bg-red-500/10 border border-red-400/20 px-2 py-0.5 rounded-full">PDF</span>
            </div>
            <a v-if="!selectMode" :href="item.url" target="_blank" rel="noopener" class="absolute inset-0 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
              <span class="text-xs font-semibold text-primary bg-background/90 backdrop-blur-sm border border-primary/20 rounded-full px-4 py-1.5 shadow-lg">Open PDF ↗</span>
            </a>
          </div>
        </template>
      </div>
      <!-- Info -->
      <div class="px-4 py-3 border-t flex items-start gap-2">
        <div class="min-w-0 flex-1">
          <p class="font-medium text-sm line-clamp-2">{{ item.name }}</p>
          <p class="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <Icon :name="item.resourceType==='image'?'i-lucide-image':'i-lucide-external-link'" class="size-3 flex-shrink-0" />
            {{ item.resourceType==='image' ? 'Menu photo scan' : 'Click to open PDF' }}
          </p>
        </div>
      </div>
      <!-- Select checkbox -->
      <div v-if="selectMode" :class="['absolute top-2 left-2 size-6 rounded-full border-2 flex items-center justify-center shadow-sm', selected.has(item.publicId) ? 'bg-primary border-primary scale-110' : 'bg-black/40 border-white/70 backdrop-blur-sm']">
        <Icon v-if="selected.has(item.publicId)" name="i-lucide-check" class="size-3.5 text-primary-foreground" />
      </div>
      <!-- Action buttons -->
      <div v-if="!selectMode" class="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
        <button v-if="item.resourceType==='image'" :class="['size-7 rounded-full flex items-center justify-center backdrop-blur-sm shadow bg-black/50 hover:bg-indigo-600 transition-all', moving===item.publicId&&'bg-indigo-600 animate-pulse']" title="Move to Photos" @click="askMove({ publicId: item.publicId, resourceType: 'image', name: item.name, fromSection: 'menus' }, $event)"><Icon name="i-lucide-folder-symlink" class="size-3.5 text-white" /></button>
        <button :class="['size-7 rounded-full flex items-center justify-center backdrop-blur-sm shadow transition-all', deleting===item.publicId ? 'bg-red-600 animate-pulse' : 'bg-black/50 hover:bg-red-600']" title="Delete" @click="askDelete({ publicId: item.publicId, resourceType: item.resourceType, name: item.name }, $event)"><Icon name="i-lucide-trash-2" class="size-3.5 text-white" /></button>
      </div>
    </div>
  </div>
</template>
