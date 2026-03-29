import { Prep } from '../../models/Prep'
import { expandPrepItemToIngredients } from '../../utils/recipe-expansion'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const method = getMethod(event)

  // GET /api/preps/:id
  if (method === 'GET') {
    const item = await Prep.findById(id).lean()
    if (!item) throw createError({ statusCode: 404, statusMessage: 'Prep entry not found' })
    return item
  }

  // PUT /api/preps/:id
  if (method === 'PUT') {
    const body = await readBody(event)
    if (body.item && body.qty !== undefined) {
      body.consumedItems = await expandPrepItemToIngredients(body.item, body.qty || 1)
    }
    const item = await Prep.findByIdAndUpdate(id, body, { returnDocument: 'after', runValidators: true }).lean()
    if (!item) throw createError({ statusCode: 404, statusMessage: 'Prep entry not found' })
    return item
  }

  // DELETE /api/preps/:id
  if (method === 'DELETE') {
    const item = await Prep.findByIdAndDelete(id).lean()
    if (!item) throw createError({ statusCode: 404, statusMessage: 'Prep entry not found' })
    return { message: 'Prep entry deleted successfully' }
  }
})
