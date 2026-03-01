<script setup lang="ts">
interface MediaItem { publicId: string; url: string; thumb: string; name: string; width?: number; height?: number }
interface DeleteTarget { publicId: string; resourceType: 'image' | 'video' | 'raw'; name: string }
interface MoveTarget { publicId: string; resourceType: 'image' | 'video' | 'raw'; name: string; fromSection: 'images' | 'videos' | 'menus' }

const g = inject('gallery') as any
const { images, selectMode, selected, deleting, moving, toggleSelect, openImage, askDelete, askMove, failedThumbs, onThumbError, imageClass, imageAspect, viewMode } = g

// ─── Carousel state ───────────────────────────────────────────────────────────
const carouselIdx  = ref(0)
const isPlaying    = ref(false)
const imgAnimKey   = ref(0)
const filmstripRef = ref<HTMLElement | null>(null)
let   playTimer: ReturnType<typeof setInterval> | null = null

const currentImg = computed<MediaItem>(() => images.value[carouselIdx.value] ?? images.value[0])

function goTo(idx: number) {
  carouselIdx.value = (idx + images.value.length) % images.value.length
  imgAnimKey.value++
  nextTick(() => {
    const el = filmstripRef.value?.children[carouselIdx.value] as HTMLElement
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  })
}
function prev() { goTo(carouselIdx.value - 1) }
function next() { goTo(carouselIdx.value + 1) }

function togglePlay() {
  if (isPlaying.value) { clearInterval(playTimer!); playTimer = null; isPlaying.value = false }
  else { isPlaying.value = true; playTimer = setInterval(() => goTo(carouselIdx.value + 1), 5000) }
}
function stopPlay() { clearInterval(playTimer!); playTimer = null; isPlaying.value = false }

function carouselKeydown(e: KeyboardEvent) {
  if (viewMode.value !== 'carousel') return
  if (e.key === 'ArrowLeft') { e.preventDefault(); prev() }
  if (e.key === 'ArrowRight') { e.preventDefault(); next() }
  if (e.key === ' ') { e.preventDefault(); togglePlay() }
  if (e.key === 'Escape') { viewMode.value = 'grid'; stopPlay() }
}

onMounted(() => window.addEventListener('keydown', carouselKeydown))
onBeforeUnmount(() => { window.removeEventListener('keydown', carouselKeydown); stopPlay() })
watch(viewMode, v => { if (v === 'grid') stopPlay() })
watch(() => images.value.length, () => { if (carouselIdx.value >= images.value.length) carouselIdx.value = 0 })
</script>

<template>
  <div v-if="images.length === 0" class="py-24 flex flex-col items-center gap-4 text-muted-foreground">
    <div class="size-20 rounded-2xl bg-muted flex items-center justify-center"><Icon name="i-lucide-image-off" class="size-10 opacity-30" /></div>
    <div class="text-center"><p class="text-sm font-medium">No photos yet</p><p class="text-xs opacity-60 mt-1">Upload photos using the button above</p></div>
  </div>

  <div v-else class="flex flex-col gap-4">

    <!-- ── MASONRY GRID ─────────────────────────────────────────────────────── -->
    <div v-if="viewMode === 'grid'" class="masonry-grid">
      <div
        v-for="(item, idx) in images"
        :key="item.publicId"
        :class="['masonry-item group relative overflow-hidden rounded-2xl bg-muted transition-all duration-300', imageClass(item), selectMode ? 'cursor-pointer' : 'cursor-zoom-in', selected.has(item.publicId) ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : '']"
        :style="{ aspectRatio: imageAspect(item) }"
        @click="openImage(item, idx)"
      >
        <img v-if="!failedThumbs.has(item.thumb)" :src="item.thumb" :alt="item.name" class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]" loading="lazy" decoding="async" @error="onThumbError(item.thumb)">
        <div v-else class="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/30 gap-2"><Icon name="i-lucide-image-off" class="size-7" /></div>
        <div v-if="!selectMode" class="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div v-if="!selectMode" class="absolute bottom-0 inset-x-0 flex items-end justify-between p-3 translate-y-1 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <p class="text-white text-[11px] font-medium truncate max-w-[70%] drop-shadow">{{ item.name }}</p>
          <Icon name="i-lucide-maximize-2" class="size-3.5 text-white" />
        </div>
        <div v-if="selectMode" class="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors" />
        <Transition name="pop">
          <div v-if="selectMode" :class="['absolute top-2.5 left-2.5 size-6 rounded-full border-2 flex items-center justify-center shadow-md', selected.has(item.publicId) ? 'bg-primary border-primary scale-110' : 'bg-black/50 border-white/80 backdrop-blur-sm']">
            <Icon v-if="selected.has(item.publicId)" name="i-lucide-check" class="size-3.5 text-primary-foreground" />
          </div>
        </Transition>
        <div v-if="!selectMode" class="absolute top-2.5 right-2.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
          <button :class="['size-7 rounded-full flex items-center justify-center backdrop-blur-sm shadow-md bg-black/50 hover:bg-indigo-600 transition-all scale-90 group-hover:scale-100', moving===item.publicId&&'bg-indigo-600 animate-pulse']" title="Move to Menus" @click="askMove({ publicId: item.publicId, resourceType: 'image', name: item.name, fromSection: 'images' }, $event)"><Icon name="i-lucide-folder-symlink" class="size-3.5 text-white" /></button>
          <button :class="['size-7 rounded-full flex items-center justify-center backdrop-blur-sm shadow-md bg-black/50 hover:bg-red-600 transition-all scale-90 group-hover:scale-100', deleting===item.publicId&&'bg-red-600 animate-pulse']" title="Delete" @click="askDelete({ publicId: item.publicId, resourceType: 'image', name: item.name }, $event)"><Icon name="i-lucide-trash-2" class="size-3.5 text-white" /></button>
        </div>
      </div>
    </div>

    <!-- ── CAROUSEL ──────────────────────────────────────────────────────────── -->
    <div v-else class="carousel-wrap">

      <!-- Blurred ambient background -->
      <div class="carousel-ambient" :style="{ backgroundImage: `url(${currentImg.thumb})` }" />

      <!-- Main stage -->
      <div class="carousel-stage" @mouseenter="isPlaying&&stopPlay()" @mouseleave="">

        <!-- Prev -->
        <button class="carousel-nav left" @click="prev">
          <Icon name="i-lucide-chevron-left" class="size-7 text-white" />
        </button>

        <!-- Image with Ken Burns + crossfade -->
        <div class="carousel-img-container">
          <Transition name="cf">
            <img
              :key="`${carouselIdx}-${imgAnimKey}`"
              :src="currentImg.url"
              :alt="currentImg.name"
              class="carousel-main-img"
            >
          </Transition>
        </div>

        <!-- Next -->
        <button class="carousel-nav right" @click="next">
          <Icon name="i-lucide-chevron-right" class="size-7 text-white" />
        </button>

        <!-- Top-right actions -->
        <div class="absolute top-4 right-4 flex items-center gap-2 z-20">
          <button class="carousel-action-btn" title="Move to Menus" @click="askMove({ publicId: currentImg.publicId, resourceType: 'image', name: currentImg.name, fromSection: 'images' }, $event)"><Icon name="i-lucide-folder-symlink" class="size-4" /></button>
          <button class="carousel-action-btn hover:!bg-red-600" title="Delete" @click="askDelete({ publicId: currentImg.publicId, resourceType: 'image', name: currentImg.name }, $event)"><Icon name="i-lucide-trash-2" class="size-4" /></button>
        </div>

        <!-- Bottom overlay: name + controls -->
        <div class="absolute bottom-0 inset-x-0 px-6 py-5 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-20">
          <div class="flex items-end justify-between">
            <div>
              <p class="text-white font-semibold text-base leading-tight drop-shadow-lg">{{ currentImg.name }}</p>
              <p class="text-white/50 text-xs mt-0.5 tabular-nums">{{ carouselIdx + 1 }} / {{ images.length }}</p>
            </div>
            <div class="flex items-center gap-2">
              <button :class="['carousel-ctrl-btn', isPlaying && 'text-primary bg-primary/20']" title="Play / Pause" @click="togglePlay">
                <Icon :name="isPlaying ? 'i-lucide-pause' : 'i-lucide-play'" class="size-4 fill-current" />
              </button>
            </div>
          </div>
          <!-- Progress bar (autoplay) -->
          <div v-if="isPlaying" class="mt-3 h-[2px] rounded-full bg-white/20 overflow-hidden">
            <div class="h-full bg-white rounded-full carousel-progress-bar" />
          </div>
        </div>
      </div>

      <!-- Film strip -->
      <div ref="filmstripRef" class="filmstrip">
        <button
          v-for="(img, i) in images"
          :key="img.publicId"
          :class="['filmstrip-thumb', i === carouselIdx && 'active']"
          @click="goTo(Number(i))"
        >
          <img :src="img.thumb" :alt="img.name" class="w-full h-full object-cover" loading="lazy">
          <div v-if="i === carouselIdx" class="filmstrip-active-ring" />
        </button>
      </div>

      <!-- Keyboard hint -->
      <p class="text-center text-xs text-muted-foreground mt-2 select-none">
        ← → navigate &nbsp;·&nbsp; Space play/pause &nbsp;·&nbsp; Esc exit carousel
      </p>
    </div>
  </div>
</template>

<style scoped>
/* ── Masonry ──────────────────────────────────────────────────────────────── */
.masonry-grid { columns: 2; column-gap: 10px; }
@media(min-width:640px)  { .masonry-grid { columns: 3; } }
@media(min-width:1024px) { .masonry-grid { columns: 4; } }
@media(min-width:1280px) { .masonry-grid { columns: 5; } }
.masonry-item { display: block; width: 100%; break-inside: avoid; margin-bottom: 10px; }

/* ── Carousel wrapper ─────────────────────────────────────────────────────── */
.carousel-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-radius: 20px;
  overflow: hidden;
  background: #0a0a0a;
}
/* Ambient blurred background */
.carousel-ambient {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  filter: blur(60px) saturate(140%) brightness(0.4);
  transform: scale(1.1);
  transition: background-image 0.8s ease;
  z-index: 0;
}

/* Stage (fixed 62vh) */
.carousel-stage {
  position: relative;
  height: 62vh;
  min-height: 380px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  overflow: hidden;
}

/* Image container */
.carousel-img-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/* Main image with Ken Burns */
.carousel-main-img {
  max-height: 100%;
  max-width: 90%;
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 40px 80px rgba(0,0,0,0.7);
  animation: kenburns 9s ease-out forwards;
  z-index: 1;
  position: relative;
}
@keyframes kenburns {
  from { transform: scale(1.0) translate3d(0, 0, 0); }
  to   { transform: scale(1.06) translate3d(-1%, 0.5%, 0); }
}

/* Cross-fade transition */
.cf-enter-active { transition: opacity 0.5s ease, transform 0.5s ease; position: absolute; }
.cf-leave-active { transition: opacity 0.4s ease, transform 0.4s ease; position: absolute; }
.cf-enter-from   { opacity: 0; transform: scale(1.04); }
.cf-leave-to     { opacity: 0; transform: scale(0.97); }

/* Nav buttons */
.carousel-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 20;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255,255,255,0.12);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.carousel-nav:hover { background: rgba(255,255,255,0.25); transform: translateY(-50%) scale(1.08); }
.carousel-nav.left  { left: 16px; }
.carousel-nav.right { right: 16px; }

/* Action buttons (top-right) */
.carousel-action-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: all 0.2s;
}
.carousel-action-btn:hover { background: rgba(99,102,241,0.7); }

/* Control buttons */
.carousel-ctrl-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255,255,255,0.12);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: all 0.2s;
}
.carousel-ctrl-btn:hover { background: rgba(255,255,255,0.25); }

/* Autoplay progress */
@keyframes progress-fill {
  from { width: 0%; }
  to   { width: 100%; }
}
.carousel-progress-bar {
  animation: progress-fill 5s linear;
}

/* Film strip */
.filmstrip {
  display: flex;
  gap: 6px;
  padding: 10px 12px;
  overflow-x: auto;
  scroll-behavior: smooth;
  scrollbar-width: none;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(10px);
  z-index: 1;
  position: relative;
}
.filmstrip::-webkit-scrollbar { display: none; }

.filmstrip-thumb {
  position: relative;
  flex-shrink: 0;
  width: 72px;
  height: 52px;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.25s cubic-bezier(.34,1.56,.64,1);
  opacity: 0.5;
  cursor: pointer;
  border: 2px solid transparent;
}
.filmstrip-thumb:hover { opacity: 0.8; transform: scale(1.05); }
.filmstrip-thumb.active {
  opacity: 1;
  transform: scale(1.12);
  border-color: white;
  box-shadow: 0 0 0 2px rgba(255,255,255,0.3), 0 8px 20px rgba(0,0,0,0.4);
}
.filmstrip-active-ring {
  position: absolute;
  inset: 0;
  border-radius: 6px;
  ring: 2px solid white;
  box-shadow: inset 0 0 0 2px rgba(255,255,255,0.6);
}

/* Transitions */
.pop-enter-active { transition: all 0.2s cubic-bezier(.34,1.56,.64,1); }
.pop-leave-active { transition: all 0.15s ease; }
.pop-enter-from,.pop-leave-to { opacity: 0; transform: scale(0.5); }
</style>
