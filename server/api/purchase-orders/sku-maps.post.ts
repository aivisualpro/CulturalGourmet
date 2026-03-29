import { VendorSkuMap } from '~~/server/models/PurchaseOrder'

// POST /api/purchase-orders/sku-maps — upsert a mapping
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { vendorId, vendorSku, ...rest } = body

  if (!vendorId || !vendorSku) {
    throw createError({ statusCode: 400, message: 'vendorId and vendorSku are required' })
  }

  const map = await VendorSkuMap.findOneAndUpdate(
    { vendorId, vendorSku },
    { $set: { vendorId, vendorSku, ...rest } },
    { upsert: true, returnDocument: 'after', runValidators: true },
  )
  return map
})
