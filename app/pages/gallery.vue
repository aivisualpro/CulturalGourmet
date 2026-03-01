<script setup lang="ts">
useHead({ title: 'Gallery — The Culture Gourmet' })
const { setHeader } = usePageHeader()
setHeader({ title: 'Gallery', description: 'Our moments, menus & memories', icon: 'i-lucide-images' })

// ─── Types ────────────────────────────────────────────────────────────────────
interface MediaItem    { publicId: string; url: string; thumb: string; name: string; width?: number; height?: number }
interface PdfItem      { publicId: string; url: string; name: string; resourceType: 'image' | 'raw'; thumb?: string }
interface DeleteTarget { publicId: string; resourceType: 'image' | 'video' | 'raw'; name: string }
interface MoveTarget   { publicId: string; resourceType: 'image' | 'video' | 'raw'; name: string; fromSection: 'images' | 'videos' | 'menus' }
type UploadStatus = 'pending' | 'uploading' | 'done' | 'error' | 'toobig'
interface UploadFile   { id: string; file: File; status: UploadStatus; progress: number; error?: string; preview?: string }

// ─── Data ─────────────────────────────────────────────────────────────────────
const { data, pending, refresh } = await useFetch('/api/gallery')
const images = computed<MediaItem[]>(() => (data.value?.images ?? []) as unknown as MediaItem[])
const videos = computed<MediaItem[]>(() => (data.value?.videos ?? []) as unknown as MediaItem[])
const pdfs   = computed<PdfItem[]>  (() => (data.value?.pdfs   ?? []) as unknown as PdfItem[])

// ─── Tab (route-driven) ───────────────────────────────────────────────────────
const route     = useRoute()
const activeTab = computed(() => {
  const seg = route.path.split('/').pop()
  return seg === 'videos' ? 'videos' : seg === 'menus' ? 'menus' : 'images'
})
const currentList = computed<any[]>(() =>
  activeTab.value === 'images' ? images.value : activeTab.value === 'videos' ? videos.value : pdfs.value)

// ─── Lightbox ─────────────────────────────────────────────────────────────────
const lightbox    = ref<{ item: MediaItem; type: 'image' | 'video' } | null>(null)
const lightboxIdx = ref(0)
function openImage(item: MediaItem, idx: number) {
  if (selectMode.value) { toggleSelect(item.publicId); return }
  lightbox.value = { item, type: 'image' }; lightboxIdx.value = idx
}
function openVideo(item: MediaItem, idx: number) {
  if (selectMode.value) { toggleSelect(item.publicId); return }
  lightbox.value = { item, type: 'video' }; lightboxIdx.value = idx
}
function closeLightbox() { lightbox.value = null }
function prevLightbox() {
  const list = activeTab.value === 'images' ? images.value : videos.value
  lightboxIdx.value = (lightboxIdx.value - 1 + list.length) % list.length
  const item = list[lightboxIdx.value]; if (!item) return
  lightbox.value = { item, type: activeTab.value === 'images' ? 'image' : 'video' }
}
function nextLightbox() {
  const list = activeTab.value === 'images' ? images.value : videos.value
  lightboxIdx.value = (lightboxIdx.value + 1) % list.length
  const item = list[lightboxIdx.value]; if (!item) return
  lightbox.value = { item, type: activeTab.value === 'images' ? 'image' : 'video' }
}
function handleKeydown(e: KeyboardEvent) {
  if (uploadOpen.value) return
  if (!lightbox.value) return
  if (e.key === 'Escape') closeLightbox()
  if (e.key === 'ArrowRight') nextLightbox()
  if (e.key === 'ArrowLeft') prevLightbox()
}
onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))

// ─── Helpers ──────────────────────────────────────────────────────────────────
const failedThumbs = ref<Set<string>>(new Set())
function onThumbError(url: string) { failedThumbs.value = new Set([...failedThumbs.value, url]) }
function imageClass(item: MediaItem) {
  if (!item.width || !item.height) return ''
  const r = item.width / item.height
  return r < 0.8 ? 'tall' : r > 1.65 ? 'wide' : ''
}
function imageAspect(item: MediaItem) {
  return item.width && item.height ? `${item.width} / ${item.height}` : '4 / 3'
}

// ─── Selection ────────────────────────────────────────────────────────────────
const selectMode = ref(false)
const selected   = ref<Set<string>>(new Set())
function toggleSelectMode() { selectMode.value = !selectMode.value; if (!selectMode.value) selected.value = new Set() }
watch(activeTab, () => { selected.value = new Set() })
function toggleSelect(publicId: string) {
  const next = new Set(selected.value)
  next.has(publicId) ? next.delete(publicId) : next.add(publicId)
  selected.value = next
}
const allSelected = computed(() =>
  currentList.value.length > 0 && currentList.value.every((i: any) => selected.value.has(i.publicId)))
function toggleSelectAll() {
  if (allSelected.value) selected.value = new Set()
  else selected.value = new Set(currentList.value.map((i: any) => i.publicId))
}

// ─── Local data remove ────────────────────────────────────────────────────────
function removeFromData(ids: string[]) {
  const set = new Set(ids); if (!data.value) return
  data.value = {
    images: (data.value.images ?? []).filter((i: any) => !set.has(i.publicId)),
    videos: (data.value.videos ?? []).filter((i: any) => !set.has(i.publicId)),
    pdfs:   (data.value.pdfs   ?? []).filter((i: any) => !set.has(i.publicId)),
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────
const confirmDelete = ref<DeleteTarget | null>(null)
const deleting      = ref<string | null>(null)
function askDelete(target: DeleteTarget, e: MouseEvent) { e.stopPropagation(); confirmDelete.value = target }
async function doDelete() {
  const t = confirmDelete.value; if (!t) return
  confirmDelete.value = null; deleting.value = t.publicId
  try { await $fetch('/api/gallery', { method: 'DELETE', query: { publicId: t.publicId, resourceType: t.resourceType } }); removeFromData([t.publicId]); if (lightbox.value?.item.publicId === t.publicId) closeLightbox() }
  catch (err) { console.error(err) }
  finally { deleting.value = null }
}
const confirmBulkDelete = ref(false)
const bulkDeleting      = ref(false)
function askBulkDelete() { confirmBulkDelete.value = true }
async function doBulkDelete() {
  const targets = [...selected.value]; if (!targets.length) return
  confirmBulkDelete.value = false; bulkDeleting.value = true
  try {
    const imgIds = new Set(images.value.map(i => i.publicId))
    const vidIds = new Set(videos.value.map(i => i.publicId))
    await Promise.all(targets.map(id => $fetch('/api/gallery', { method: 'DELETE', query: { publicId: id, resourceType: imgIds.has(id) ? 'image' : vidIds.has(id) ? 'video' : 'raw' } })))
    removeFromData(targets); selected.value = new Set()
    if (lightbox.value && targets.includes(lightbox.value.item.publicId)) closeLightbox()
  } catch (err) { console.error(err) }
  finally { bulkDeleting.value = false }
}

// ─── Move ─────────────────────────────────────────────────────────────────────
const moveTarget = ref<MoveTarget | null>(null)
const moving     = ref<string | null>(null)
function askMove(target: MoveTarget, e: MouseEvent) { e.stopPropagation(); moveTarget.value = target }
async function doMove(toSection: 'images' | 'menus') {
  const t = moveTarget.value; if (!t) return
  moveTarget.value = null; moving.value = t.publicId
  try { await $fetch('/api/gallery', { method: 'PUT', body: { publicId: t.publicId, resourceType: t.resourceType, toSection } }); await refresh() }
  catch (err: any) { alert(err?.data?.statusMessage ?? 'Move failed') }
  finally { moving.value = null }
}
const confirmBulkMove  = ref<'images' | 'menus' | null>(null)
const bulkMoving       = ref(false)
const bulkMoveProgress = ref(0)
const bulkMovableIds = computed(() => {
  const imgSet     = new Set(images.value.map(i => i.publicId))
  const menuImgSet = new Set(pdfs.value.filter(p => p.resourceType === 'image').map(p => p.publicId))
  return [...selected.value].filter(id => imgSet.has(id) || menuImgSet.has(id))
})
function askBulkMove(toSection: 'images' | 'menus') { confirmBulkMove.value = toSection }
async function doBulkMove() {
  const toSection = confirmBulkMove.value; if (!toSection) return
  const targets = [...bulkMovableIds.value]; if (!targets.length) return
  confirmBulkMove.value = null; bulkMoving.value = true; bulkMoveProgress.value = 0
  let done = 0, idx = 0
  async function next(): Promise<void> {
    if (idx >= targets.length) return
    const id = targets[idx++]; if (!id) return
    try { await $fetch('/api/gallery', { method: 'PUT', body: { publicId: id, resourceType: 'image', toSection } }) } catch {}
    bulkMoveProgress.value = Math.round((++done / targets.length) * 100); await next()
  }
  await Promise.all(Array.from({ length: Math.min(3, targets.length) }, next))
  selected.value = new Set(); selectMode.value = false; await refresh()
  bulkMoving.value = false; bulkMoveProgress.value = 0
}

// ─── Upload ───────────────────────────────────────────────────────────────────
const uploadOpen   = ref(false)
const uploadFiles  = ref<UploadFile[]>([])
const isDragging   = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const IMAGE_EXTS = new Set(['jpg','jpeg','png','webp','gif','avif','heic'])
const VIDEO_EXTS = new Set(['mp4','mov','webm','avi','mkv'])
const PDF_EXTS   = new Set(['pdf'])
const MAX_BYTES  = 10 * 1024 * 1024
function getExt(n: string) { return (n.split('.').pop() ?? '').toLowerCase() }
const uploadConfig = computed(() => {
  if (activeTab.value === 'videos') return { accept: 'video/*,.mov,.mkv', label: 'Upload videos', hint: 'MP4, MOV, WEBM, MKV', icon: 'i-lucide-video', section: 'videos' as const }
  if (activeTab.value === 'menus')  return { accept: '.pdf,image/*,.heic', label: 'Upload menus', hint: 'PDF or menu photo scan', icon: 'i-lucide-file-text', section: 'menus' as const }
  return { accept: 'image/*,.heic', label: 'Upload photos', hint: 'JPG, PNG, HEIC, WEBP, GIF', icon: 'i-lucide-image', section: 'images' as const }
})
function openUpload() { uploadFiles.value = []; uploadOpen.value = true }
function closeUpload() { if (uploadFiles.value.some(f => f.status === 'uploading')) return; uploadOpen.value = false; uploadFiles.value = [] }
function addFiles(raw: FileList | File[]) {
  for (const file of Array.from(raw)) {
    const ext = getExt(file.name); const id = crypto.randomUUID()
    const entry: UploadFile = { id, file, status: 'pending', progress: 0 }
    if (!IMAGE_EXTS.has(ext) && !VIDEO_EXTS.has(ext) && !PDF_EXTS.has(ext)) { entry.status = 'error'; entry.error = 'Unsupported type' }
    else if (file.size > MAX_BYTES) { entry.status = 'toobig'; entry.error = `${(file.size / 1024 / 1024).toFixed(1)} MB — max 10 MB` }
    else if (IMAGE_EXTS.has(ext) || file.type.startsWith('image/')) { const r = new FileReader(); r.onload = e => { const f = uploadFiles.value.find(f => f.id === id); if (f) f.preview = e.target?.result as string }; r.readAsDataURL(file) }
    uploadFiles.value.push(entry)
  }
}
function onFileInputChange(e: Event) { const f = (e.target as HTMLInputElement).files; if (f) addFiles(f); if (fileInputRef.value) fileInputRef.value.value = '' }
function onDrop(e: DragEvent) { isDragging.value = false; if (e.dataTransfer?.files) addFiles(e.dataTransfer.files) }
function removeUploadFile(id: string) { uploadFiles.value = uploadFiles.value.filter(f => f.id !== id) }
const uploadableFiles = computed(() => uploadFiles.value.filter(f => f.status === 'pending'))
const isUploading     = computed(() => uploadFiles.value.some(f => f.status === 'uploading'))
const allDone         = computed(() => uploadFiles.value.length > 0 && uploadFiles.value.every(f => ['done','error','toobig'].includes(f.status)))
const doneCount       = computed(() => uploadFiles.value.filter(f => f.status === 'done').length)
const failedCount     = computed(() => uploadFiles.value.filter(f => ['error','toobig'].includes(f.status)).length)
const overallProgress = computed(() => {
  if (!uploadFiles.value.length) return 0
  const done = uploadFiles.value.filter(f => f.status === 'done').length
  const partial = uploadFiles.value.filter(f => f.status === 'uploading').reduce((s, f) => s + f.progress, 0)
  return Math.round(((done * 100 + partial) / (uploadFiles.value.length * 100)) * 100)
})
async function uploadSingle(entry: UploadFile) {
  entry.status = 'uploading'; entry.progress = 0
  const fd = new FormData(); fd.append('file', entry.file); fd.append('targetSection', uploadConfig.value.section)
  return new Promise<void>(resolve => {
    const xhr = new XMLHttpRequest(); xhr.open('POST', '/api/gallery')
    xhr.upload.addEventListener('progress', e => { if (e.lengthComputable) entry.progress = Math.round((e.loaded / e.total) * 100) })
    xhr.addEventListener('load', () => {
      if (xhr.status === 200 || xhr.status === 201) { entry.progress = 100; entry.status = 'done' }
      else { try { const b = JSON.parse(xhr.responseText); entry.error = b.statusMessage || `Error ${xhr.status}` } catch { entry.error = `Error ${xhr.status}` }; entry.status = xhr.status === 413 ? 'toobig' : 'error' }
      resolve()
    })
    xhr.addEventListener('error', () => { entry.error = 'Network error'; entry.status = 'error'; resolve() })
    xhr.send(fd)
  })
}
async function startUpload() {
  const queue = uploadFiles.value.filter(f => f.status === 'pending'); if (!queue.length) return
  let i = 0
  async function next() { if (i >= queue.length) return; const e = queue[i++]; if (!e) return; await uploadSingle(e); await next() }
  await Promise.all(Array.from({ length: Math.min(3, queue.length) }, next))
  await refresh()
}

// ─── View mode (grid / carousel) — shared with images.vue ───────────────────
const viewMode = ref<'grid' | 'carousel'>('grid')
watch(activeTab, () => { viewMode.value = 'grid' })

// ─── Provide to child pages ───────────────────────────────────────────────────
provide('gallery', { images, videos, pdfs, selectMode, selected, deleting, moving, toggleSelect, openImage, openVideo, askDelete, askMove, failedThumbs, onThumbError, imageClass, imageAspect, refresh, viewMode })
</script>

<template>
  <div class="flex flex-col gap-5">

    <!-- Tab bar -->
    <div class="flex items-center justify-between border-b">
      <div class="flex items-center gap-1">
        <NuxtLink
          v-for="tab in [
            { id: 'images', label: 'Photos',  icon: 'i-lucide-image',     count: images.length },
            { id: 'videos', label: 'Videos',  icon: 'i-lucide-video',     count: videos.length },
            { id: 'menus',  label: 'Menus',   icon: 'i-lucide-file-text', count: pdfs.length },
          ]"
          :key="tab.id"
          :to="`/gallery/${tab.id}`"
          :class="['flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-all duration-200', activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border']"
          @click="selectMode && toggleSelectMode()"
        >
          <Icon :name="tab.icon" class="size-4" />
          {{ tab.label }}
          <span :class="['text-xs px-1.5 py-0.5 rounded-full tabular-nums font-semibold', activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground']">{{ tab.count }}</span>
        </NuxtLink>
      </div>
      <div class="flex items-center gap-2 mb-px">
        <!-- Grid / Carousel toggle — only on Photos tab with images present -->
        <div v-if="activeTab === 'images' && images.length > 0" class="flex items-center gap-0.5 p-1 bg-muted rounded-xl border">
          <button
            :class="['flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200', viewMode === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground']"
            @click="viewMode = 'grid'"
          >
            <Icon name="i-lucide-layout-grid" class="size-3.5" /> Grid
          </button>
          <button
            :class="['flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200', viewMode === 'carousel' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground']"
            @click="viewMode = 'carousel'"
          >
            <Icon name="i-lucide-gallery-horizontal-end" class="size-3.5" /> Carousel
          </button>
        </div>
        <button :class="['flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all', selectMode ? 'bg-primary text-primary-foreground' : 'border text-muted-foreground hover:text-foreground hover:bg-muted/60']" @click="toggleSelectMode">
          <Icon :name="selectMode ? 'i-lucide-x' : 'i-lucide-check-square'" class="size-4" />
          {{ selectMode ? 'Cancel' : 'Select' }}
        </button>
        <button class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm" @click="openUpload">
          <Icon :name="uploadConfig.icon" class="size-4" /> {{ uploadConfig.label }}
        </button>
      </div>
    </div>

    <!-- Select-all bar -->
    <Transition name="slide">
      <div v-if="selectMode && currentList.length > 0" class="flex items-center gap-4 -mt-2">
        <button class="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors" @click="toggleSelectAll">
          <div :class="['size-5 rounded border-2 flex items-center justify-center transition-all', allSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40']">
            <Icon v-if="allSelected" name="i-lucide-check" class="size-3 text-primary-foreground" />
          </div>
          {{ allSelected ? 'Deselect all' : 'Select all' }}
        </button>
        <span v-if="selected.size" class="text-xs text-muted-foreground">{{ selected.size }} selected</span>
      </div>
    </Transition>

    <!-- Loading skeleton -->
    <div v-if="pending" class="masonry-grid">
      <div v-for="(h, i) in [260,340,220,380,290,310,250,360,240,300,270,330]" :key="i" class="rounded-2xl bg-muted animate-pulse" :style="{ height: `${h}px`, animationDelay: `${i*60}ms` }" />
    </div>

    <!-- Child page -->
    <NuxtPage v-if="!pending" />

    <!-- ── LIGHTBOX ──────────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="lb">
        <div v-if="lightbox" class="fixed inset-0 z-[999] bg-black/97 flex items-center justify-center" @click.self="closeLightbox">
          <div class="absolute top-0 inset-x-0 h-16 flex items-center justify-between px-4 bg-gradient-to-b from-black/70 to-transparent z-10">
            <span class="text-white/70 text-sm tabular-nums">{{ lightboxIdx + 1 }} / {{ (activeTab === 'images' ? images : videos).length }}</span>
            <p class="text-white/60 text-xs truncate hidden sm:block max-w-xs">{{ lightbox.item.name }}</p>
            <div class="flex items-center gap-2">
              <button class="size-9 rounded-full bg-white/10 hover:bg-red-600 flex items-center justify-center text-white" @click="askDelete({ publicId: lightbox.item.publicId, resourceType: activeTab === 'images' ? 'image' : 'video', name: lightbox.item.name }, $event)"><Icon name="i-lucide-trash-2" class="size-4" /></button>
              <button class="size-9 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white" @click="closeLightbox"><Icon name="i-lucide-x" class="size-5" /></button>
            </div>
          </div>
          <button class="absolute left-3 top-1/2 -translate-y-1/2 size-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10 backdrop-blur-sm" @click.stop="prevLightbox"><Icon name="i-lucide-chevron-left" class="size-6" /></button>
          <div class="max-w-7xl w-full px-14 flex items-center justify-center">
            <img v-if="lightbox.type === 'image'" :src="lightbox.item.url" :alt="lightbox.item.name" class="max-h-[92vh] max-w-full object-contain rounded-lg shadow-2xl">
            <video v-else :src="lightbox.item.url" :poster="lightbox.item.thumb" class="max-h-[92vh] max-w-full rounded-lg shadow-2xl" controls autoplay />
          </div>
          <button class="absolute right-3 top-1/2 -translate-y-1/2 size-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10 backdrop-blur-sm" @click.stop="nextLightbox"><Icon name="i-lucide-chevron-right" class="size-6" /></button>
        </div>
      </Transition>
    </Teleport>

    <!-- ── UPLOAD MODAL ──────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="lb">
        <div v-if="uploadOpen" class="fixed inset-0 z-[1002] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" @click.self="closeUpload">
          <div class="bg-card border rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl flex flex-col max-h-[92vh] overflow-hidden">
            <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b flex-shrink-0">
              <div class="flex items-center gap-3">
                <div class="size-9 rounded-xl bg-primary/10 flex items-center justify-center"><Icon :name="uploadConfig.icon" class="size-5 text-primary" /></div>
                <div><h2 class="font-semibold text-base">{{ uploadConfig.label }}</h2><p class="text-xs text-muted-foreground">Max 10 MB per file</p></div>
              </div>
              <button class="size-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground" :disabled="isUploading" @click="closeUpload"><Icon name="i-lucide-x" class="size-4" /></button>
            </div>
            <div class="px-6 pt-5 pb-3 flex-shrink-0">
              <div :class="['border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all', isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/40']" @dragover.prevent="isDragging=true" @dragleave.prevent="isDragging=false" @drop.prevent="onDrop" @click="fileInputRef?.click()">
                <input ref="fileInputRef" type="file" multiple :accept="uploadConfig.accept" class="hidden" @change="onFileInputChange">
                <div :class="['size-14 rounded-2xl flex items-center justify-center', isDragging ? 'bg-primary/15' : 'bg-muted']"><Icon :name="isDragging ? 'i-lucide-download' : 'i-lucide-upload-cloud'" :class="['size-7', isDragging ? 'text-primary' : 'text-muted-foreground']" /></div>
                <div class="text-center">
                  <p class="text-sm font-medium" :class="isDragging ? 'text-primary' : ''">{{ isDragging ? 'Drop files here' : 'Drag & drop or click to browse' }}</p>
                  <p class="text-xs text-muted-foreground mt-1">{{ uploadConfig.hint }}</p>
                </div>
              </div>
            </div>
            <div v-if="uploadFiles.length" class="flex-1 overflow-y-auto px-6 pb-2 min-h-0">
              <TransitionGroup name="file-list" tag="div" class="space-y-2">
                <div v-for="entry in uploadFiles" :key="entry.id" :class="['flex items-center gap-3 p-3 rounded-xl border', entry.status==='done' ? 'bg-emerald-500/5 border-emerald-500/20' : entry.status==='error'||entry.status==='toobig' ? 'bg-red-500/5 border-red-500/20' : entry.status==='uploading' ? 'bg-primary/5 border-primary/20' : 'bg-muted/40 border-border']">
                  <div class="size-11 rounded-lg overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
                    <img v-if="entry.preview" :src="entry.preview" class="w-full h-full object-cover" alt="">
                    <Icon v-else :name="entry.file.type.startsWith('video/') ? 'i-lucide-video' : entry.file.type==='application/pdf'||getExt(entry.file.name)==='pdf' ? 'i-lucide-file-text' : 'i-lucide-image'" class="size-5 text-muted-foreground" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium truncate">{{ entry.file.name }}</p>
                    <div class="flex items-center gap-2 mt-0.5 text-xs">
                      <span class="text-muted-foreground">{{ (entry.file.size/1024/1024).toFixed(1) }} MB</span>
                      <span v-if="entry.status==='error'||entry.status==='toobig'" class="text-red-500 truncate">— {{ entry.error }}</span>
                      <span v-else-if="entry.status==='done'" class="text-emerald-600 font-medium">Uploaded ✓</span>
                      <span v-else-if="entry.status==='uploading'" class="text-primary font-medium">{{ entry.progress }}%</span>
                    </div>
                    <div v-if="entry.status==='uploading'" class="mt-1.5 h-1 rounded-full bg-primary/15 overflow-hidden"><div class="h-full rounded-full bg-primary transition-all" :style="{width:`${entry.progress}%`}" /></div>
                  </div>
                  <Icon v-if="entry.status==='done'" name="i-lucide-check-circle-2" class="size-5 text-emerald-500 flex-shrink-0" />
                  <Icon v-else-if="entry.status==='uploading'" name="i-lucide-loader-2" class="size-5 text-primary animate-spin flex-shrink-0" />
                  <Icon v-else-if="entry.status==='error'||entry.status==='toobig'" name="i-lucide-alert-circle" class="size-5 text-red-500 flex-shrink-0" />
                  <button v-else class="size-6 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0" @click="removeUploadFile(entry.id)"><Icon name="i-lucide-x" class="size-3.5" /></button>
                </div>
              </TransitionGroup>
            </div>
            <Transition name="fade"><div v-if="isUploading" class="px-6 pt-3 flex-shrink-0"><div class="flex justify-between mb-1.5 text-xs"><span class="text-muted-foreground">Overall</span><span class="font-semibold text-primary tabular-nums">{{ overallProgress }}%</span></div><div class="h-2 rounded-full bg-primary/10 overflow-hidden"><div class="h-full rounded-full bg-primary transition-all duration-500" :style="{width:`${overallProgress}%`}" /></div></div></Transition>
            <Transition name="fade"><div v-if="allDone" class="px-6 pt-3 flex-shrink-0"><div :class="['flex items-center gap-3 px-4 py-3 rounded-xl text-sm', failedCount===0 ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700' : 'bg-amber-500/10 border border-amber-500/20 text-amber-700']"><Icon :name="failedCount===0 ? 'i-lucide-check-circle-2' : 'i-lucide-alert-triangle'" class="size-5 flex-shrink-0" /><span><strong>{{ doneCount }}</strong> uploaded<template v-if="failedCount"> · <strong>{{ failedCount }}</strong> failed</template></span></div></div></Transition>
            <div class="flex items-center justify-between px-6 py-4 border-t flex-shrink-0 mt-2">
              <p class="text-xs text-muted-foreground">{{ uploadableFiles.length ? `${uploadableFiles.length} ready` : '' }}</p>
              <div class="flex gap-2">
                <button v-if="allDone" class="px-4 py-2 rounded-xl text-sm font-medium border hover:bg-muted" @click="closeUpload">Close</button>
                <button v-if="!allDone" class="px-4 py-2 rounded-xl text-sm font-medium border hover:bg-muted" :disabled="isUploading" @click="closeUpload">Cancel</button>
                <button v-if="!allDone" :disabled="!uploadableFiles.length||isUploading" :class="['flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all', uploadableFiles.length&&!isUploading ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted text-muted-foreground cursor-not-allowed']" @click="startUpload">
                  <Icon :name="isUploading ? 'i-lucide-loader-2' : 'i-lucide-upload'" :class="['size-4', isUploading && 'animate-spin']" />
                  {{ isUploading ? 'Uploading…' : `Upload ${uploadableFiles.length || ''}` }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── DELETE CONFIRM ────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="lb">
        <div v-if="confirmDelete" class="fixed inset-0 z-[1001] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" @click.self="confirmDelete=null">
          <div class="bg-card border rounded-2xl shadow-2xl p-6 w-full max-w-sm flex flex-col gap-4">
            <div class="flex items-start gap-3"><div class="size-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0"><Icon name="i-lucide-trash-2" class="size-5 text-red-500" /></div><div class="min-w-0"><p class="font-semibold text-sm">Delete file?</p><p class="text-xs text-muted-foreground mt-0.5 break-all line-clamp-2">{{ confirmDelete.name }}</p></div></div>
            <p class="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2.5 border">⚠️ Permanently deleted from Cloudinary. Cannot be undone.</p>
            <div class="flex gap-2 justify-end"><button class="px-4 py-2 rounded-lg text-sm font-medium border hover:bg-muted" @click="confirmDelete=null">Cancel</button><button class="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white" @click="doDelete">Delete</button></div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── BULK DELETE CONFIRM ────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="lb">
        <div v-if="confirmBulkDelete" class="fixed inset-0 z-[1001] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" @click.self="confirmBulkDelete=false">
          <div class="bg-card border rounded-2xl shadow-2xl p-6 w-full max-w-sm flex flex-col gap-4">
            <div class="flex items-start gap-3"><div class="size-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0"><Icon name="i-lucide-trash-2" class="size-5 text-red-500" /></div><div><p class="font-semibold text-sm">Delete {{ selected.size }} file{{ selected.size===1?'':'s' }}?</p><p class="text-xs text-muted-foreground mt-0.5">Permanently removed from Cloudinary.</p></div></div>
            <div class="flex gap-2 justify-end"><button class="px-4 py-2 rounded-lg text-sm font-medium border hover:bg-muted" @click="confirmBulkDelete=false">Cancel</button><button class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white disabled:opacity-60" :disabled="bulkDeleting" @click="doBulkDelete"><Icon v-if="bulkDeleting" name="i-lucide-loader-2" class="size-4 animate-spin" />Delete {{ selected.size }}</button></div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── MOVE CONFIRM ──────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="lb">
        <div v-if="moveTarget" class="fixed inset-0 z-[1001] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" @click.self="moveTarget=null">
          <div class="bg-card border rounded-2xl shadow-2xl p-6 w-full max-w-sm flex flex-col gap-4">
            <div class="flex items-start gap-3"><div class="size-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0"><Icon name="i-lucide-folder-symlink" class="size-5 text-indigo-500" /></div><div class="min-w-0"><p class="font-semibold text-sm">Move file?</p><p class="text-xs text-muted-foreground mt-0.5 break-all line-clamp-2">{{ moveTarget.name }}</p></div></div>
            <p class="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2.5 border leading-relaxed">From <strong>{{ moveTarget.fromSection==='images'?'Photos':'Menus' }}</strong> → <strong>{{ moveTarget.fromSection==='images'?'Menus':'Photos' }}</strong>. Only the Cloudinary folder changes.</p>
            <div class="flex gap-2 justify-end"><button class="px-4 py-2 rounded-lg text-sm font-medium border hover:bg-muted" @click="moveTarget=null">Cancel</button><button class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white" @click="doMove(moveTarget.fromSection==='images'?'menus':'images')"><Icon name="i-lucide-folder-symlink" class="size-4" />Move to {{ moveTarget.fromSection==='images'?'Menus':'Photos' }}</button></div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── BULK MOVE CONFIRM ─────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="lb">
        <div v-if="confirmBulkMove" class="fixed inset-0 z-[1002] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" @click.self="!bulkMoving&&(confirmBulkMove=null)">
          <div class="bg-card border rounded-2xl shadow-2xl p-6 w-full max-w-sm flex flex-col gap-4">
            <div class="flex items-start gap-3"><div class="size-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0"><Icon name="i-lucide-folder-symlink" class="size-5 text-indigo-500" /></div><div><p class="font-semibold text-sm">Move {{ bulkMovableIds.length }} file{{ bulkMovableIds.length!==1?'s':'' }}?</p><p class="text-xs text-muted-foreground mt-0.5">From <strong>{{ confirmBulkMove==='menus'?'Photos':'Menus' }}</strong> → <strong>{{ confirmBulkMove==='menus'?'Menus':'Photos' }}</strong></p></div></div>
            <div v-if="bulkMoving" class="space-y-1.5"><div class="flex justify-between text-xs"><span class="text-muted-foreground">Renaming…</span><span class="font-semibold text-indigo-600 tabular-nums">{{ bulkMoveProgress }}%</span></div><div class="h-2 rounded-full bg-indigo-100 dark:bg-indigo-950/50 overflow-hidden"><div class="h-full rounded-full bg-indigo-600 transition-all" :style="{width:`${bulkMoveProgress}%`}" /></div></div>
            <p v-else class="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2.5 border">Only the Cloudinary folder changes.<template v-if="selected.size>bulkMovableIds.length"><br><span class="text-amber-600">⚠ {{ selected.size-bulkMovableIds.length }} item(s) cannot be moved and will be skipped.</span></template></p>
            <div class="flex gap-2 justify-end"><button class="px-4 py-2 rounded-lg text-sm font-medium border hover:bg-muted" :disabled="bulkMoving" @click="confirmBulkMove=null">Cancel</button><button class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60" :disabled="bulkMoving" @click="doBulkMove"><Icon :name="bulkMoving?'i-lucide-loader-2':'i-lucide-folder-symlink'" :class="['size-4',bulkMoving&&'animate-spin']" />{{ bulkMoving?'Moving…':`Move ${bulkMovableIds.length}` }}</button></div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── FLOATING BULK ACTION BAR ─────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="float">
        <div v-if="selectMode && selected.size > 0" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[998] flex items-center gap-3 bg-card/95 backdrop-blur-md border shadow-2xl rounded-2xl px-4 py-3">
          <div class="flex items-center gap-2"><div class="size-6 rounded-full bg-primary flex items-center justify-center"><span class="text-primary-foreground text-[11px] font-bold tabular-nums">{{ selected.size }}</span></div><span class="text-sm font-medium">selected</span></div>
          <div class="w-px h-4 bg-border" />
          <button class="text-sm text-muted-foreground hover:text-foreground" @click="selected=new Set()">Clear</button>
          <template v-if="bulkMovableIds.length>0&&(activeTab==='images'||activeTab==='menus')">
            <div class="w-px h-4 bg-border" />
            <button v-if="activeTab==='images'" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-60" :disabled="bulkMoving" @click="askBulkMove('menus')"><Icon name="i-lucide-folder-symlink" class="size-3.5" />Move {{ bulkMovableIds.length }} to Menus</button>
            <button v-if="activeTab==='menus'" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-60" :disabled="bulkMoving" @click="askBulkMove('images')"><Icon name="i-lucide-folder-symlink" class="size-3.5" />Move {{ bulkMovableIds.length }} to Photos</button>
          </template>
          <div class="w-px h-4 bg-border" />
          <button class="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-60" :disabled="bulkDeleting" @click="askBulkDelete"><Icon name="i-lucide-trash-2" class="size-3.5" />Delete {{ selected.size }}</button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.lb-enter-active,.lb-leave-active{transition:opacity .2s ease}
.lb-enter-from,.lb-leave-to{opacity:0}
.slide-enter-active,.slide-leave-active{transition:all .2s ease}
.slide-enter-from,.slide-leave-to{opacity:0;transform:translateY(-6px)}
.fade-enter-active,.fade-leave-active{transition:opacity .15s ease}
.fade-enter-from,.fade-leave-to{opacity:0}
.float-enter-active,.float-leave-active{transition:all .3s cubic-bezier(.34,1.56,.64,1)}
.float-enter-from,.float-leave-to{opacity:0;transform:translate(-50%,20px) scale(.95)}
.file-list-enter-active{transition:all .25s ease}
.file-list-leave-active{transition:all .2s ease}
.file-list-enter-from{opacity:0;transform:translateY(-8px)}
.file-list-leave-to{opacity:0;transform:translateX(20px)}
.masonry-grid{columns:2;column-gap:10px}
@media(min-width:640px){.masonry-grid{columns:3}}
@media(min-width:1024px){.masonry-grid{columns:4}}
@media(min-width:1280px){.masonry-grid{columns:5}}
</style>
