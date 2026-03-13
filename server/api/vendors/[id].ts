import { Vendor } from '../../models/Vendor'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const method = getMethod(event)

  // GET /api/vendors/:id — get a single vendor
  if (method === 'GET') {
    const vendor = await Vendor.findById(id).lean()
    if (!vendor) {
      throw createError({ statusCode: 404, statusMessage: 'Vendor not found' })
    }
    return vendor
  }

  // PUT /api/vendors/:id — update a vendor
  if (method === 'PUT') {
    const body = await readBody(event)
    const vendor = await Vendor.findByIdAndUpdate(id, body, { returnDocument: 'after', runValidators: true }).lean()
    if (!vendor) {
      throw createError({ statusCode: 404, statusMessage: 'Vendor not found' })
    }
    return vendor
  }

  // DELETE /api/vendors/:id — delete a vendor
  if (method === 'DELETE') {
    const vendor = await Vendor.findByIdAndDelete(id).lean()
    if (!vendor) {
      throw createError({ statusCode: 404, statusMessage: 'Vendor not found' })
    }
    return { message: 'Vendor deleted successfully' }
  }
})
