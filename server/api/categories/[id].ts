import { Category } from '../../models/Category'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const method = getMethod(event)

  // GET /api/categories/:id
  if (method === 'GET') {
    const cat = await Category.findById(id).lean()
    if (!cat) throw createError({ statusCode: 404, statusMessage: 'Category not found' })
    return cat
  }

  // PUT /api/categories/:id
  if (method === 'PUT') {
    const body = await readBody(event)
    const cat = await Category.findByIdAndUpdate(id, body, { new: true, runValidators: true }).lean()
    if (!cat) throw createError({ statusCode: 404, statusMessage: 'Category not found' })
    return cat
  }

  // DELETE /api/categories/:id
  if (method === 'DELETE') {
    const cat = await Category.findByIdAndDelete(id).lean()
    if (!cat) throw createError({ statusCode: 404, statusMessage: 'Category not found' })
    return { message: 'Category deleted successfully' }
  }
})
