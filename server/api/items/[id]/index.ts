import { Item } from '../../../models/Item'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const method = getMethod(event)

  if (method === 'GET') {
    const item = await Item.findById(id).lean()
    if (!item) throw createError({ statusCode: 404, statusMessage: 'Item not found' })
    return item
  }

  if (method === 'PUT') {
    const body = await readBody(event)
    const item = await Item.findByIdAndUpdate(id, body, { returnDocument: 'after', runValidators: true }).lean()
    if (!item) throw createError({ statusCode: 404, statusMessage: 'Item not found' })
    return item
  }

  if (method === 'DELETE') {
    const item = await Item.findByIdAndDelete(id).lean()
    if (!item) throw createError({ statusCode: 404, statusMessage: 'Item not found' })
    return { message: 'Item deleted successfully' }
  }
})
