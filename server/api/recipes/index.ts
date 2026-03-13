import { Recipe } from '../../models/Recipe'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  if (method === 'GET') {
    return await Recipe.find()
      .sort({ createdAt: -1 })
      .lean()
  }

  if (method === 'POST') {
    const body = await readBody(event)

    // Auto-calculate totalCost for each ingredient
    if (body.ingredients && Array.isArray(body.ingredients)) {
      body.ingredients = body.ingredients.map((ing: any) => ({
        ...ing,
        totalCost: (Number(ing.quantity) || 0) * (Number(ing.costPerUnit) || 0),
      }))
    }

    const recipe = await Recipe.create(body)
    return recipe
  }
})
