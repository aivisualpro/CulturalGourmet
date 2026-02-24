import { Category } from '../../models/Category'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  // GET /api/categories
  if (method === 'GET') {
    return await Category.find().sort({ name: 1 }).lean()
  }

  // POST /api/categories
  if (method === 'POST') {
    const body = await readBody(event)
    return await Category.create(body)
  }
})
