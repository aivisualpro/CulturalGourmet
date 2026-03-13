import { Recipe } from '../../models/Recipe'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const method = getMethod(event)

  if (method === 'GET') {
    const recipe = await Recipe.findById(id).lean()
    if (!recipe) throw createError({ statusCode: 404, statusMessage: 'Recipe not found' })
    return recipe
  }

  if (method === 'PUT') {
    const body = await readBody(event)

    // Auto-calculate totalCost for each ingredient
    if (body.ingredients && Array.isArray(body.ingredients)) {
      body.ingredients = body.ingredients.map((ing: any) => ({
        ...ing,
        totalCost: (Number(ing.quantity) || 0) * (Number(ing.costPerUnit) || 0),
      }))
    }

    const recipe = await Recipe.findByIdAndUpdate(id, body, { returnDocument: 'after', runValidators: true }).lean()
    if (!recipe) throw createError({ statusCode: 404, statusMessage: 'Recipe not found' })
    return recipe
  }

  if (method === 'DELETE') {
    const recipe = await Recipe.findByIdAndDelete(id).lean()
    if (!recipe) throw createError({ statusCode: 404, statusMessage: 'Recipe not found' })
    return { message: 'Recipe deleted successfully' }
  }
})
