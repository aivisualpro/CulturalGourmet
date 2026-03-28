import { PurchaseOrder } from '~~/server/models/PurchaseOrder'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (body.status === 'reviewed' && !body.reviewedAt) body.reviewedAt = new Date()
  if (body.status === 'approved' && !body.approvedAt) body.approvedAt = new Date()
  if (body.status === 'received' && !body.receivedAt) body.receivedAt = new Date()

  const po = await PurchaseOrder.findByIdAndUpdate(
    id,
    { $set: body },
    { new: true, runValidators: true },
  )
  if (!po) throw createError({ statusCode: 404, message: 'Purchase order not found' })
  return po
})
