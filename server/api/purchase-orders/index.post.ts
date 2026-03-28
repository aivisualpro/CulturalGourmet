import { PurchaseOrder } from '~~/server/models/PurchaseOrder'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const po = await PurchaseOrder.create(body)
  return po
})
