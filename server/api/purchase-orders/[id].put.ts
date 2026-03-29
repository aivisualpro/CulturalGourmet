import { PurchaseOrder } from '~~/server/models/PurchaseOrder'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (body.status === 'reviewed' && !body.reviewedAt) body.reviewedAt = new Date()
  if (body.status === 'approved' && !body.approvedAt) body.approvedAt = new Date()
  if (body.status === 'received' && !body.receivedAt) body.receivedAt = new Date()

  // Prevent duplicate invoices for the same vendor (excluding self)
  const vendorIdToCheck = body.vendorId
  const invoiceNumberToCheck = body.invoiceNumber

  if (vendorIdToCheck && invoiceNumberToCheck) {
    const existing = await PurchaseOrder.findOne({
      _id: { $ne: id },
      vendorId: vendorIdToCheck,
      invoiceNumber: invoiceNumberToCheck,
    }).lean()

    if (existing) {
      throw createError({
        statusCode: 400,
        message: `An invoice with number "${invoiceNumberToCheck}" already exists for this vendor.`,
      })
    }
  }

  const po = await PurchaseOrder.findByIdAndUpdate(
    id,
    { $set: body },
    { returnDocument: 'after', runValidators: true },
  )
  if (!po) throw createError({ statusCode: 404, message: 'Purchase order not found' })
  return po
})
