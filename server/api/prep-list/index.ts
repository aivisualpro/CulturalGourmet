import { PrepItem } from '../../models/PrepItem'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  if (method === 'GET') {
    return await PrepItem.find().sort({ createdAt: -1 }).lean()
  }

  if (method === 'POST') {
    const body = await readBody(event)
    return await PrepItem.create(body)
  }
})
