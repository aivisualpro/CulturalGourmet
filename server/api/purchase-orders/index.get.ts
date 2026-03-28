import { PurchaseOrder } from '~~/server/models/PurchaseOrder'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 20
  const skip = (page - 1) * limit
  const status = query.status as string | undefined
  const vendorId = query.vendorId as string | undefined
  const search = query.search as string | undefined

  const filter: Record<string, any> = {}
  if (status && status !== 'all') filter.status = status
  if (vendorId) filter.vendorId = vendorId
  if (search) {
    filter.$or = [
      { vendorName: { $regex: search, $options: 'i' } },
      { invoiceNumber: { $regex: search, $options: 'i' } },
    ]
  }

  const [items, total] = await Promise.all([
    PurchaseOrder.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-rawExtractedText -lineItems')
      .lean(),
    PurchaseOrder.countDocuments(filter),
  ])

  return { items, total, page, limit }
})
