import { Location } from '../../models/Location'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const method = getMethod(event)

  if (method === 'GET') {
    const loc = await Location.findById(id).lean()
    if (!loc) throw createError({ statusCode: 404, statusMessage: 'Location not found' })
    return loc
  }

  if (method === 'PUT') {
    const body = await readBody(event)
    const loc = await Location.findByIdAndUpdate(id, body, { returnDocument: 'after', runValidators: true }).lean()
    if (!loc) throw createError({ statusCode: 404, statusMessage: 'Location not found' })
    return loc
  }

  if (method === 'DELETE') {
    const loc = await Location.findByIdAndDelete(id).lean()
    if (!loc) throw createError({ statusCode: 404, statusMessage: 'Location not found' })
    return { message: 'Location deleted successfully' }
  }
})
