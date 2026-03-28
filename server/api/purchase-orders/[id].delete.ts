import { PurchaseOrder } from '~~/server/models/PurchaseOrder'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const po = await PurchaseOrder.findByIdAndDelete(id)
  if (!po) throw createError({ statusCode: 404, message: 'Purchase order not found' })
  return { success: true }
})
