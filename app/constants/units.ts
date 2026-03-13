// ══════════════════════════════════════════════════════════════
//  Culinary Units & Conversion Engine
//  Comprehensive unit system for food-service operations
// ══════════════════════════════════════════════════════════════

export interface UnitDef {
  /** Unique key stored in DB, e.g. 'lb' */
  key: string
  /** Human-readable label, e.g. 'Pound (LB)' */
  label: string
  /** Short display abbreviation, e.g. 'lb' */
  abbr: string
  /** Category group for the dropdown UI */
  category: UnitCategory
  /** Factor to convert 1 of this unit → the category's base unit.
   *  Base units: gram (weight), ml (volume), each (count) */
  toBase: number
}

export type UnitCategory = 'weight' | 'volume' | 'count' | 'length' | 'temperature' | 'other'

export const UNIT_CATEGORIES: { key: UnitCategory, label: string, icon: string }[] = [
  { key: 'weight', label: 'Weight / Mass', icon: 'i-lucide-weight' },
  { key: 'volume', label: 'Volume / Liquid', icon: 'i-lucide-beaker' },
  { key: 'count', label: 'Count / Each', icon: 'i-lucide-hash' },
  { key: 'length', label: 'Length', icon: 'i-lucide-ruler' },
  { key: 'temperature', label: 'Temperature', icon: 'i-lucide-thermometer' },
  { key: 'other', label: 'Other', icon: 'i-lucide-box' },
]

// ─── Base units: gram (weight), ml (volume), each (count), mm (length) ──

export const UNITS: UnitDef[] = [
  // ── Weight / Mass (base = gram) ────────────────────────────
  { key: 'g', label: 'Gram (g)', abbr: 'g', category: 'weight', toBase: 1 },
  { key: 'kg', label: 'Kilogram (kg)', abbr: 'kg', category: 'weight', toBase: 1000 },
  { key: 'mg', label: 'Milligram (mg)', abbr: 'mg', category: 'weight', toBase: 0.001 },
  { key: 'oz', label: 'Ounce (oz)', abbr: 'oz', category: 'weight', toBase: 28.3495 },
  { key: 'lb', label: 'Pound (lb)', abbr: 'lb', category: 'weight', toBase: 453.592 },
  { key: 'ton', label: 'Ton (US)', abbr: 'ton', category: 'weight', toBase: 907185 },
  { key: 'mt', label: 'Metric Ton', abbr: 'mt', category: 'weight', toBase: 1_000_000 },

  // ── Volume / Liquid (base = ml) ────────────────────────────
  { key: 'ml', label: 'Milliliter (ml)', abbr: 'ml', category: 'volume', toBase: 1 },
  { key: 'l', label: 'Liter (L)', abbr: 'L', category: 'volume', toBase: 1000 },
  { key: 'tsp', label: 'Teaspoon (tsp)', abbr: 'tsp', category: 'volume', toBase: 4.92892 },
  { key: 'tbsp', label: 'Tablespoon (tbsp)', abbr: 'tbsp', category: 'volume', toBase: 14.7868 },
  { key: 'fl_oz', label: 'Fluid Ounce (fl oz)', abbr: 'fl oz', category: 'volume', toBase: 29.5735 },
  { key: 'cup', label: 'Cup', abbr: 'cup', category: 'volume', toBase: 236.588 },
  { key: 'pt', label: 'Pint (pt)', abbr: 'pt', category: 'volume', toBase: 473.176 },
  { key: 'qt', label: 'Quart (qt)', abbr: 'qt', category: 'volume', toBase: 946.353 },
  { key: 'gal', label: 'Gallon (gal)', abbr: 'gal', category: 'volume', toBase: 3785.41 },
  { key: 'half_gal', label: 'Half Gallon', abbr: '½ gal', category: 'volume', toBase: 1892.71 },

  // ── Count / Each (base = each) ─────────────────────────────
  { key: 'each', label: 'Each (ea)', abbr: 'ea', category: 'count', toBase: 1 },
  { key: 'dozen', label: 'Dozen (dz)', abbr: 'dz', category: 'count', toBase: 12 },
  { key: 'pair', label: 'Pair', abbr: 'pair', category: 'count', toBase: 2 },
  { key: 'case', label: 'Case', abbr: 'case', category: 'count', toBase: 1 },
  { key: 'pack', label: 'Pack', abbr: 'pack', category: 'count', toBase: 1 },
  { key: 'bag', label: 'Bag', abbr: 'bag', category: 'count', toBase: 1 },
  { key: 'box', label: 'Box', abbr: 'box', category: 'count', toBase: 1 },
  { key: 'can', label: 'Can', abbr: 'can', category: 'count', toBase: 1 },
  { key: 'jar', label: 'Jar', abbr: 'jar', category: 'count', toBase: 1 },
  { key: 'bottle', label: 'Bottle', abbr: 'btl', category: 'count', toBase: 1 },
  { key: 'bunch', label: 'Bunch', abbr: 'bunch', category: 'count', toBase: 1 },
  { key: 'head', label: 'Head', abbr: 'head', category: 'count', toBase: 1 },
  { key: 'clove', label: 'Clove', abbr: 'clove', category: 'count', toBase: 1 },
  { key: 'slice', label: 'Slice', abbr: 'slice', category: 'count', toBase: 1 },
  { key: 'piece', label: 'Piece', abbr: 'pc', category: 'count', toBase: 1 },
  { key: 'sheet', label: 'Sheet', abbr: 'sheet', category: 'count', toBase: 1 },
  { key: 'serving', label: 'Serving', abbr: 'srv', category: 'count', toBase: 1 },
  { key: 'portion', label: 'Portion', abbr: 'ptn', category: 'count', toBase: 1 },
  { key: 'recipe', label: 'Recipe', abbr: 'recipe', category: 'count', toBase: 1 },
  { key: 'batch', label: 'Batch', abbr: 'batch', category: 'count', toBase: 1 },

  // ── Length (base = mm) ─────────────────────────────────────
  { key: 'mm', label: 'Millimeter (mm)', abbr: 'mm', category: 'length', toBase: 1 },
  { key: 'cm', label: 'Centimeter (cm)', abbr: 'cm', category: 'length', toBase: 10 },
  { key: 'in', label: 'Inch (in)', abbr: 'in', category: 'length', toBase: 25.4 },
  { key: 'ft', label: 'Foot (ft)', abbr: 'ft', category: 'length', toBase: 304.8 },

  // ── Temperature (special – not linearly convertible) ───────
  { key: 'f', label: 'Fahrenheit (°F)', abbr: '°F', category: 'temperature', toBase: 1 },
  { key: 'c', label: 'Celsius (°C)', abbr: '°C', category: 'temperature', toBase: 1 },

  // ── Other ───────────────────────────────────────────────────
  { key: 'pinch', label: 'Pinch', abbr: 'pinch', category: 'other', toBase: 1 },
  { key: 'dash', label: 'Dash', abbr: 'dash', category: 'other', toBase: 1 },
  { key: 'drop', label: 'Drop', abbr: 'drop', category: 'other', toBase: 1 },
  { key: 'smidgen', label: 'Smidgen', abbr: 'smidgen', category: 'other', toBase: 1 },
  { key: 'to_taste', label: 'To Taste', abbr: 'TT', category: 'other', toBase: 1 },
  { key: 'as_needed', label: 'As Needed', abbr: 'a/n', category: 'other', toBase: 1 },
]

// ─── Lookup Maps ─────────────────────────────────────────────
const unitMap = new Map<string, UnitDef>()
UNITS.forEach(u => unitMap.set(u.key, u))

export function getUnit(key: string): UnitDef | undefined {
  return unitMap.get(key)
}

export function getUnitAbbr(key: string): string {
  return unitMap.get(key)?.abbr || key || ''
}

export function getUnitLabel(key: string): string {
  return unitMap.get(key)?.label || key || ''
}

/** Group units by category for dropdown rendering */
export function getGroupedUnits(): { category: string, label: string, icon: string, units: UnitDef[] }[] {
  return UNIT_CATEGORIES.map(cat => ({
    category: cat.key,
    label: cat.label,
    icon: cat.icon,
    units: UNITS.filter(u => u.category === cat.key),
  }))
}

// ─── Conversion Engine ───────────────────────────────────────

export interface ConversionResult {
  success: boolean
  value: number
  fromUnit: string
  toUnit: string
  label: string
  error?: string
}

/**
 * Convert a value from one unit to another.
 * Only converts within the same category (weight→weight, volume→volume, etc.)
 * Temperature uses special formulas.
 */
export function convertUnit(value: number, fromKey: string, toKey: string): ConversionResult {
  if (!value || !fromKey || !toKey) {
    return { success: false, value: 0, fromUnit: fromKey, toUnit: toKey, label: '', error: 'Missing value or units' }
  }

  if (fromKey === toKey) {
    return { success: true, value, fromUnit: fromKey, toUnit: toKey, label: `${value} ${getUnitAbbr(fromKey)}` }
  }

  const from = getUnit(fromKey)
  const to = getUnit(toKey)

  if (!from || !to) {
    return { success: false, value: 0, fromUnit: fromKey, toUnit: toKey, label: '', error: 'Unknown unit' }
  }

  if (from.category !== to.category) {
    return {
      success: false,
      value: 0,
      fromUnit: fromKey,
      toUnit: toKey,
      label: '',
      error: `Cannot convert ${from.category} to ${to.category}`,
    }
  }

  // Special: temperature
  if (from.category === 'temperature') {
    const converted = convertTemperature(value, fromKey, toKey)
    const rounded = Math.round(converted * 1000) / 1000
    return { success: true, value: rounded, fromUnit: fromKey, toUnit: toKey, label: `${rounded} ${getUnitAbbr(toKey)}` }
  }

  // "other" and most "count" units are non-convertible containers
  if (from.category === 'other') {
    return {
      success: false,
      value: 0,
      fromUnit: fromKey,
      toUnit: toKey,
      label: '',
      error: 'Cannot convert approximate measurements',
    }
  }

  // Standard linear conversion: value → base → target
  const baseValue = value * from.toBase
  const converted = baseValue / to.toBase
  const rounded = Math.round(converted * 10000) / 10000

  return {
    success: true,
    value: rounded,
    fromUnit: fromKey,
    toUnit: toKey,
    label: `${rounded} ${getUnitAbbr(toKey)}`,
  }
}

function convertTemperature(value: number, from: string, to: string): number {
  if (from === 'f' && to === 'c') return (value - 32) * (5 / 9)
  if (from === 'c' && to === 'f') return (value * 9 / 5) + 32
  return value
}

/**
 * Get all possible conversions for a given unit value.
 * Returns conversions to every other unit in the same category.
 */
export function getAllConversions(value: number, fromKey: string): ConversionResult[] {
  const from = getUnit(fromKey)
  if (!from) return []

  return UNITS
    .filter(u => u.category === from.category && u.key !== fromKey)
    .map(u => convertUnit(value, fromKey, u.key))
    .filter(r => r.success)
}

/**
 * Smart format: returns a nice string with appropriate decimal places.
 */
export function formatUnitValue(value: number, unitKey: string): string {
  if (!value && value !== 0) return ''
  const abbr = getUnitAbbr(unitKey)

  // Smart decimal formatting
  if (Number.isInteger(value)) return `${value} ${abbr}`
  if (value >= 100) return `${value.toFixed(1)} ${abbr}`
  if (value >= 1) return `${value.toFixed(2)} ${abbr}`
  return `${value.toFixed(4)} ${abbr}`
}

/**
 * Check if two units are in the same category (and thus convertible).
 */
export function areUnitsConvertible(unitA: string, unitB: string): boolean {
  const a = getUnit(unitA)
  const b = getUnit(unitB)
  if (!a || !b) return false
  if (a.category === 'other' || b.category === 'other') return false
  return a.category === b.category
}

/**
 * Get common kitchen conversions as quick-reference data.
 */
export const QUICK_CONVERSIONS = [
  { label: '1 cup = 16 tbsp', from: 'cup', to: 'tbsp', value: 1 },
  { label: '1 cup = 8 fl oz', from: 'cup', to: 'fl_oz', value: 1 },
  { label: '1 gal = 4 qt', from: 'gal', to: 'qt', value: 1 },
  { label: '1 gal = 128 fl oz', from: 'gal', to: 'fl_oz', value: 1 },
  { label: '1 lb = 16 oz', from: 'lb', to: 'oz', value: 1 },
  { label: '1 kg = 2.205 lb', from: 'kg', to: 'lb', value: 1 },
  { label: '1 qt = 2 pt', from: 'qt', to: 'pt', value: 1 },
  { label: '1 tbsp = 3 tsp', from: 'tbsp', to: 'tsp', value: 1 },
  { label: '1 L = 4.227 cups', from: 'l', to: 'cup', value: 1 },
  { label: '1 oz = 28.35 g', from: 'oz', to: 'g', value: 1 },
]
