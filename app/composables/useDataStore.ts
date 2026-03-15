/**
 * useDataStore — Global data prefetch store
 *
 * Fetches ALL application data in parallel on login/app-init,
 * then serves it from memory so every route renders instantly.
 *
 * Usage:
 *   const { categories, vendors, recipes, ... } = useDataStore()
 *
 * Each data slice has:
 *   - Reactive data ref
 *   - Individual refresh function
 *   - Ready flag (true once initial load is done)
 *
 * On auth login / app mount, call `prefetchAll()` once.
 * After a mutation (create/update/delete), call the slice's refresh.
 */

interface DataStoreState {
  // ─── Core lists ───────────────────────────────────────────
  dashboard: any | null
  categories: any[]
  vendors: any[]
  locations: any[]
  recipes: any[]
  items: any[]
  consumptions: any[]
  preps: any[]
  prepList: any[]

  // ─── Meta ─────────────────────────────────────────────────
  ready: boolean
  loading: boolean
  lastFetchedAt: number | null
}

const STALE_TIME = 5 * 60 * 1000 // 5 minutes
const _fetch = $fetch as typeof $fetch<any, any>

// Singleton state shared across all component instances
const state = reactive<DataStoreState>({
  dashboard: null,
  categories: [],
  vendors: [],
  locations: [],
  recipes: [],
  items: [],
  consumptions: [],
  preps: [],
  prepList: [],
  ready: false,
  loading: false,
  lastFetchedAt: null,
})

// In-flight promise to deduplicate concurrent prefetchAll() calls
let inflight: Promise<void> | null = null

export function useDataStore() {
  // ─── Individual fetchers ──────────────────────────────────
  async function fetchDashboard() {
    try { state.dashboard = await _fetch('/api/dashboard') }
    catch (e) { console.error('[DataStore] dashboard fetch failed', e) }
  }

  async function fetchCategories() {
    try { state.categories = await _fetch('/api/categories') }
    catch (e) { console.error('[DataStore] categories fetch failed', e) }
  }

  async function fetchVendors() {
    try { state.vendors = await _fetch('/api/vendors') }
    catch (e) { console.error('[DataStore] vendors fetch failed', e) }
  }

  async function fetchLocations() {
    try { state.locations = await _fetch('/api/locations') }
    catch (e) { console.error('[DataStore] locations fetch failed', e) }
  }

  async function fetchRecipes() {
    try { state.recipes = await _fetch('/api/recipes') }
    catch (e) { console.error('[DataStore] recipes fetch failed', e) }
  }

  async function fetchItems() {
    try { state.items = await _fetch('/api/items') }
    catch (e) { console.error('[DataStore] items fetch failed', e) }
  }

  async function fetchConsumptions(params?: Record<string, any>) {
    try { state.consumptions = await _fetch('/api/consumptions', { params }) }
    catch (e) { console.error('[DataStore] consumptions fetch failed', e) }
  }

  async function fetchPreps() {
    try { state.preps = await _fetch('/api/preps') }
    catch (e) { console.error('[DataStore] preps fetch failed', e) }
  }

  async function fetchPrepList() {
    try { state.prepList = await _fetch('/api/prep-list') }
    catch (e) { console.error('[DataStore] prep-list fetch failed', e) }
  }

  // ─── Prefetch everything in parallel ──────────────────────
  async function prefetchAll(force = false) {
    // Skip if already loaded and not stale (unless forced)
    if (
      !force
      && state.ready
      && state.lastFetchedAt
      && Date.now() - state.lastFetchedAt < STALE_TIME
    ) {
      return
    }

    // Deduplicate concurrent calls
    if (inflight) return inflight

    state.loading = true

    inflight = Promise.all([
      fetchDashboard(),
      fetchCategories(),
      fetchVendors(),
      fetchLocations(),
      fetchRecipes(),
      fetchItems(),
      fetchConsumptions(),
      fetchPreps(),
      fetchPrepList(),
    ]).then(() => {
      state.ready = true
      state.lastFetchedAt = Date.now()
      state.loading = false
      inflight = null
    }).catch(() => {
      state.loading = false
      inflight = null
    })

    return inflight
  }

  // ─── Reset on logout ──────────────────────────────────────
  function reset() {
    state.dashboard = null
    state.categories = []
    state.vendors = []
    state.locations = []
    state.recipes = []
    state.items = []
    state.consumptions = []
    state.preps = []
    state.prepList = []
    state.ready = false
    state.loading = false
    state.lastFetchedAt = null
    inflight = null
  }

  // Use toRefs instead of computed — toRefs doesn't require
  // an active component instance, so useDataStore() can safely
  // be called from event handlers, plugins, and other non-setup contexts.
  const refs = toRefs(state)

  return {
    // Reactive state (read-only access for pages)
    ...refs,

    // Actions — prefetch all or refresh individual slices
    prefetchAll,
    fetchDashboard,
    fetchCategories,
    fetchVendors,
    fetchLocations,
    fetchRecipes,
    fetchItems,
    fetchConsumptions,
    fetchPreps,
    fetchPrepList,
    reset,
  }
}
