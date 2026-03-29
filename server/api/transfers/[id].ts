import { Transfer } from '../../models/Transfer'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)
  const id = getRouterParam(event, 'id')

  if (method === 'GET') {
    const transfer = await Transfer.findById(id).lean()
    if (!transfer) throw createError({ statusCode: 404, statusMessage: 'Transfer not found' })
    return transfer
  }

  if (method === 'PUT') {
    const body = await readBody(event)
    const transfer = await Transfer.findByIdAndUpdate(id, body, { new: true })
    if (!transfer) throw createError({ statusCode: 404, statusMessage: 'Transfer not found' })
    return transfer
  }

  if (method === 'DELETE') {
    const transfer = await Transfer.findByIdAndDelete(id)
    if (!transfer) throw createError({ statusCode: 404, statusMessage: 'Transfer not found' })
    return { success: true }
  }
})
