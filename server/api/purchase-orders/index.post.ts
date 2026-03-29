import { PurchaseOrder } from '~~/server/models/PurchaseOrder'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // Prevent duplicate invoices for the same vendor
  if (body.invoiceNumber && body.vendorId) {
    const existing = await PurchaseOrder.findOne({
      vendorId: body.vendorId,
      invoiceNumber: body.invoiceNumber,
    }).lean()

    if (existing) {
      throw createError({
        statusCode: 400,
        message: `An invoice with number "${body.invoiceNumber}" already exists for this vendor.`,
      })
    }
  }

  const po = await PurchaseOrder.create(body)
  return po
})
