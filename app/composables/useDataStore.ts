/**
 * useDataStore — Global data prefetch store (SSR-safe)
 *
 * Uses Nuxt's useState() for SSR-safe shared state.
 * Fetches ALL application data in parallel on login/app-init,
 * then serves it from memory so every route renders instantly.
 *
 * Usage:
 *   const { categories, vendors, recipes, ... } = useDataStore()
 */

// In-flight promise to deduplicate concurrent prefetchAll() calls
let inflight: Promise<void> | null = null

export function useDataStore() {
  // SSR-safe shared state via Nuxt's useState
  const dashboard = useState<any>('ds:dashboard', () => null)
  const categories = useState<any[]>('ds:categories', () => [])
  const vendors = useState<any[]>('ds:vendors', () => [])
  const locations = useState<any[]>('ds:locations', () => [])
  const recipes = useState<any[]>('ds:recipes', () => [])
  const items = useState<any[]>('ds:items', () => [])
  const consumptions = useState<any[]>('ds:consumptions', () => [])
  const preps = useState<any[]>('ds:preps', () => [])
  const prepList = useState<any[]>('ds:prepList', () => [])
  const ready = useState<boolean>('ds:ready', () => false)
  const loading = useState<boolean>('ds:loading', () => false)
  const lastFetchedAt = useState<number | null>('ds:lastFetchedAt', () => null)

  const STALE_TIME = 5 * 60 * 1000 // 5 minutes

  // Cast to avoid Nuxt's deep recursive route-type resolution
  const _fetch = $fetch as typeof $fetch<any, any>

  // ─── Individual fetchers ──────────────────────────────────
  async function fetchDashboard() {
    try { dashboard.value = await _fetch('/api/dashboard') }
    catch (e) { console.error('[DataStore] dashboard fetch failed', e) }
  }

  async function fetchCategories() {
    try { categories.value = await _fetch('/api/categories') }
    catch (e) { console.error('[DataStore] categories fetch failed', e) }
  }

  async function fetchVendors() {
    try { vendors.value = await _fetch('/api/vendors') }
    catch (e) { console.error('[DataStore] vendors fetch failed', e) }
  }

  async function fetchLocations() {
    try { locations.value = await _fetch('/api/locations') }
    catch (e) { console.error('[DataStore] locations fetch failed', e) }
  }

  async function fetchRecipes() {
    try { recipes.value = await _fetch('/api/recipes') }
    catch (e) { console.error('[DataStore] recipes fetch failed', e) }
  }

  async function fetchItems() {
    try { items.value = await _fetch('/api/items') }
    catch (e) { console.error('[DataStore] items fetch failed', e) }
  }

  async function fetchConsumptions(params?: Record<string, any>) {
    try { consumptions.value = await _fetch('/api/consumptions', { params }) }
    catch (e) { console.error('[DataStore] consumptions fetch failed', e) }
  }

  async function fetchPreps() {
    try { preps.value = await _fetch('/api/preps') }
    catch (e) { console.error('[DataStore] preps fetch failed', e) }
  }

  async function fetchPrepList() {
    try { prepList.value = await _fetch('/api/prep-list') }
    catch (e) { console.error('[DataStore] prep-list fetch failed', e) }
  }

  // ─── Prefetch everything in parallel ──────────────────────
  async function prefetchAll(force = false) {
    // Only run on client
    if (!import.meta.client) return

    // Skip if already loaded and not stale (unless forced)
    if (
      !force
      && ready.value
      && lastFetchedAt.value
      && Date.now() - lastFetchedAt.value < STALE_TIME
    ) {
      return
    }

    // Deduplicate concurrent calls
    if (inflight) return inflight

    loading.value = true

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
      ready.value = true
      lastFetchedAt.value = Date.now()
      loading.value = false
      inflight = null
    }).catch(() => {
      loading.value = false
      inflight = null
    })

    return inflight
  }

  // ─── Reset on logout ──────────────────────────────────────
  function reset() {
    dashboard.value = null
    categories.value = []
    vendors.value = []
    locations.value = []
    recipes.value = []
    items.value = []
    consumptions.value = []
    preps.value = []
    prepList.value = []
    ready.value = false
    loading.value = false
    lastFetchedAt.value = null
    inflight = null
  }

  return {
    // Reactive state — these are Refs from useState, safe everywhere
    dashboard,
    categories,
    vendors,
    locations,
    recipes,
    items,
    consumptions,
    preps,
    prepList,
    ready,
    loading,

    // Actions
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
