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
  
  if (query.dateFrom || query.dateTo) {
    filter.invoiceDate = {}
    if (query.dateFrom) filter.invoiceDate.$gte = new Date(query.dateFrom as string)
    if (query.dateTo) filter.invoiceDate.$lte = new Date(query.dateTo as string)
  }

  if (search) {
    filter.$or = [
      { vendorName: { $regex: search, $options: 'i' } },
      { invoiceNumber: { $regex: search, $options: 'i' } },
      { orderNumber: { $regex: search, $options: 'i' } },
      { notes: { $regex: search, $options: 'i' } },
      { 'lineItems.description': { $regex: search, $options: 'i' } },
      { 'lineItems.mappedItemName': { $regex: search, $options: 'i' } },
      { 'lineItems.mappedSku': { $regex: search, $options: 'i' } },
      { 'lineItems.vendorCode': { $regex: search, $options: 'i' } },
    ]
  }

  const [rawItems, total] = await Promise.all([
    PurchaseOrder.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-rawExtractedText')
      .lean(),
    PurchaseOrder.countDocuments(filter),
  ])

  // Compute linkedItemCount and strip bulky lineItems from response
  const items = rawItems.map((po: any) => {
    const linkedItemCount = (po.lineItems || []).filter((li: any) => li.skuLinked).length
    const { lineItems, ...rest } = po
    return { ...rest, linkedItemCount }
  })

  return { items, total, page, limit }
})
