import { VendorSkuMap } from '~~/server/models/PurchaseOrder'

// GET /api/purchase-orders/sku-maps?vendorId=xxx
export default defineEventHandler(async (event) => {
  const { vendorId } = getQuery(event)
  if (!vendorId) return []
  const maps = await VendorSkuMap.find({ vendorId: String(vendorId) }).lean()
  return maps
})
