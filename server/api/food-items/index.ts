import { FoodItem } from '../../models/FoodItem'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  if (method === 'GET') {
    return await FoodItem.find()
      .populate('vendor', 'vendorName')
      .populate('location', 'name')
      .populate('description', 'name')
      .sort({ createdAt: -1 })
      .lean()
  }

  if (method === 'POST') {
    const body = await readBody(event)
    const item = await FoodItem.create(body)
    return await FoodItem.findById(item._id)
      .populate('vendor', 'vendorName')
      .populate('location', 'name')
      .populate('description', 'name')
      .lean()
  }
})
