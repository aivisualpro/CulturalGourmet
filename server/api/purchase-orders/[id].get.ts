import { PurchaseOrder } from '~~/server/models/PurchaseOrder'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const po = await PurchaseOrder.findById(id).lean()
  if (!po) throw createError({ statusCode: 404, message: 'Purchase order not found' })
  return po
})
