import { Transfer } from '../../models/Transfer'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  if (method === 'GET') {
    return await Transfer.find()
      .sort({ createdAt: -1 })
      .lean()
  }

  if (method === 'POST') {
    const body = await readBody(event)
    const transfer = await Transfer.create(body)
    return transfer
  }
})
