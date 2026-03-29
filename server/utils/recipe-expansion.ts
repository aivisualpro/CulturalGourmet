import { Recipe, type IRecipe } from '../models/Recipe'
import { PrepItem } from '../models/PrepItem'

export interface ExpandedIngredient {
  itemName: string
  quantity: number
  unit: string
}

/**
 * Expands a given Prep item (Master Prep List) into a flat list of consumed raw items (ingredients).
 * Handles deeply nested sub-recipes recursively.
 */
export async function expandPrepItemToIngredients(prepName: string, prepQty: number): Promise<ExpandedIngredient[]> {
  const masterPrep = await PrepItem.findOne({ prepName: prepName }).lean()
  if (!masterPrep || !masterPrep.recipe) {
    // If it's not a master prep item or has no recipe, it might be a raw item itself.
    return [{ itemName: prepName, quantity: prepQty, unit: '' }]
  }

  // Multiplier: How many batches of the recipe does this prep correlate to?
  // Let's assume prepQty is the yield amount, so multiplier = prepQty / yieldQty.
  // If yieldQty is not defined, we'll assume prepQty behaves as "number of batches".
  const yieldQty = masterPrep.yieldQty && masterPrep.yieldQty > 0 ? masterPrep.yieldQty : 1
  const batchQty = masterPrep.batchQty && masterPrep.batchQty > 0 ? masterPrep.batchQty : 1
  const masterMultiplier = (prepQty / yieldQty) * batchQty

  const consumptionMap = new Map<string, ExpandedIngredient>()

  // Recursively expand recipes
  async function expandRecipe(recipeName: string, multiplier: number) {
    const recipe = await Recipe.findOne({ recipeName }).lean()
    if (!recipe) {
      // If recipe not found, we can't expand it further. Treat as raw item?
      return
    }

    // Add ingredients
    for (const ing of recipe.ingredients || []) {
      if (!ing.name) continue
      const consumedQty = (ing.quantity || 0) * multiplier
      const existing = consumptionMap.get(ing.name)
      if (existing) {
        existing.quantity += consumedQty
      } else {
        consumptionMap.set(ing.name, {
          itemName: ing.name,
          quantity: consumedQty,
          unit: ing.unit || '',
        })
      }
    }

    // Recurse into sub-recipes
    for (const sub of recipe.subRecipes || []) {
      if (!sub.recipeName) continue
      const subMultiplier = (sub.quantity || 1) * multiplier
      await expandRecipe(sub.recipeName, subMultiplier)
    }
  }

  await expandRecipe(masterPrep.recipe, masterMultiplier)

  return Array.from(consumptionMap.values())
}
