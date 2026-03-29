import { Item } from '../../models/Item'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  if (method === 'GET') {
    const items = await Item.find().sort({ createdAt: -1 }).lean()

    // 1. Aggregate PurchaseOrders to get total purchased quantity and total cost per item
    const { PurchaseOrder } = await import('../../models/PurchaseOrder')
    const poStats = await PurchaseOrder.aggregate([
      { $match: { status: { $in: ['approved', 'received'] } } },
      { $unwind: '$lineItems' },
      { $match: { 'lineItems.mappedItemId': { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$lineItems.mappedItemId',
          totalPoQty: { $sum: '$lineItems.quantity' },
          totalPoCost: { $sum: { $multiply: ['$lineItems.quantity', '$lineItems.unitPrice'] } }
        }
      }
    ])

    // 2. Aggregate Preps to get total consumed quantity per item (grouped by item name)
    const { Prep } = await import('../../models/Prep')
    const prepStats = await Prep.aggregate([
      {
        $group: {
          _id: '$item',
          totalPrepQty: { $sum: { $abs: '$qty' } } // preps are consumed outward
        }
      }
    ])

    const poMap = new Map(poStats.map(s => [String(s._id), s]))
    const prepMap = new Map(prepStats.map(s => [s._id, s]))

    // 3. Attach QOH and WAC
    const enrichedItems = items.map(item => {
      const pStat = poMap.get(String(item._id)) || { totalPoQty: 0, totalPoCost: 0 }
      const prStat = prepMap.get(item.item) || { totalPrepQty: 0 }

      const qoh = pStat.totalPoQty - prStat.totalPrepQty
      // Weighted Average Cost = Total Cost of All Purchases / Total Qty of All Purchases
      const wac = pStat.totalPoQty > 0 ? (pStat.totalPoCost / pStat.totalPoQty) : 0

      return {
        ...item,
        qoh,
        wac
      }
    })

    return enrichedItems
  }

  if (method === 'POST') {
    const body = await readBody(event)

    // Auto-generate SKU if not provided
    if (!body.itemSKU || !body.itemSKU.trim()) {
      const lastItem = await Item.findOne({ itemSKU: { $regex: /^ITM-\d+$/i } })
        .sort({ itemSKU: -1 })
        .lean()

      let nextNum = 1
      if (lastItem?.itemSKU) {
        const match = lastItem.itemSKU.match(/ITM-(\d+)/i)
        if (match?.[1]) {
          nextNum = parseInt(match[1], 10) + 1
        }
      }
      body.itemSKU = `ITM-${String(nextNum).padStart(3, '0')}`
    }

    const item = await Item.create(body)
    return item
  }
})

