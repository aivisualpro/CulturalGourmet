import { Consumption } from '../../models/Consumption'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const method = getMethod(event)

  // GET /api/consumptions/:id
  if (method === 'GET') {
    const item = await Consumption.findById(id).lean()
    if (!item) throw createError({ statusCode: 404, statusMessage: 'Consumption not found' })
    return item
  }

  // PUT /api/consumptions/:id
  if (method === 'PUT') {
    const body = await readBody(event)
    const item = await Consumption.findByIdAndUpdate(id, body, { returnDocument: 'after', runValidators: true }).lean()
    if (!item) throw createError({ statusCode: 404, statusMessage: 'Consumption not found' })
    return item
  }

  // DELETE /api/consumptions/:id
  if (method === 'DELETE') {
    const item = await Consumption.findByIdAndDelete(id).lean()
    if (!item) throw createError({ statusCode: 404, statusMessage: 'Consumption not found' })
    return { message: 'Consumption deleted successfully' }
  }
})
