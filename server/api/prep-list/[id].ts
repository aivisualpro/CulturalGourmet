import { PrepItem } from '../../models/PrepItem'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)
  const id = getRouterParam(event, 'id')

  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID is required' })

  if (method === 'GET') {
    const item = await PrepItem.findById(id).lean()
    if (!item) throw createError({ statusCode: 404, statusMessage: 'Prep item not found' })
    return item
  }

  if (method === 'PUT') {
    const body = await readBody(event)
    const item = await PrepItem.findByIdAndUpdate(id, body, { returnDocument: 'after', runValidators: true }).lean()
    if (!item) throw createError({ statusCode: 404, statusMessage: 'Prep item not found' })
    return item
  }

  if (method === 'DELETE') {
    const item = await PrepItem.findByIdAndDelete(id).lean()
    if (!item) throw createError({ statusCode: 404, statusMessage: 'Prep item not found' })
    return { success: true }
  }
})
