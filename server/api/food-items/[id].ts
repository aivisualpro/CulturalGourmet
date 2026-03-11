import { FoodItem } from '../../models/FoodItem'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const method = getMethod(event)

  if (method === 'GET') {
    const item = await FoodItem.findById(id)
      .populate('vendor', 'vendorName')
      .populate('location', 'name')
      .populate('description', 'name')
      .lean()
    if (!item) throw createError({ statusCode: 404, statusMessage: 'Food item not found' })
    return item
  }

  if (method === 'PUT') {
    const body = await readBody(event)
    const item = await FoodItem.findByIdAndUpdate(id, body, { new: true, runValidators: true })
      .populate('vendor', 'vendorName')
      .populate('location', 'name')
      .populate('description', 'name')
      .lean()
    if (!item) throw createError({ statusCode: 404, statusMessage: 'Food item not found' })
    return item
  }

  if (method === 'DELETE') {
    const item = await FoodItem.findByIdAndDelete(id).lean()
    if (!item) throw createError({ statusCode: 404, statusMessage: 'Food item not found' })
    return { message: 'Food item deleted successfully' }
  }
})
