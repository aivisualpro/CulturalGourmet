import { Location } from '../../models/Location'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  if (method === 'GET') {
    return await Location.find().sort({ name: 1 }).lean()
  }

  if (method === 'POST') {
    const body = await readBody(event)
    return await Location.create(body)
  }
})
