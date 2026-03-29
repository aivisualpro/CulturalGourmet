import { Location } from '../../../models/Location'
import { Item } from '../../../models/Item'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const loc = await Location.findById(id).lean()
  if (!loc) throw createError({ statusCode: 404, statusMessage: 'Location not found' })

  const locName = loc.name

  const items = await Item.find().lean()

  // 1. POs into this location
  const { PurchaseOrder } = await import('../../../models/PurchaseOrder')
  const poStats = await PurchaseOrder.aggregate([
    { $match: { 
        status: { $in: ['approved', 'received'] },
        $or: [{ locationId: loc._id }, { locationName: locName }] 
      } 
    },
    { $unwind: '$lineItems' },
    { $match: { 'lineItems.mappedItemId': { $exists: true, $nin: [null, ''], $type: 'string' } } }, // avoid empty string
    {
      $group: {
        _id: '$lineItems.mappedItemId',
        totalPoQty: { $sum: '$lineItems.quantity' }
      }
    }
  ])

  // 2. Preps out of this location
  const { Prep } = await import('../../../models/Prep')
  const prepStats = await Prep.aggregate([
    { $match: { station: locName } },
    { $unwind: { path: '$consumedItems', preserveNullAndEmptyArrays: false } },
    {
      $group: {
        _id: '$consumedItems.itemName',
        totalPrepQty: { $sum: '$consumedItems.quantity' }
      }
    }
  ])

  // 3. Transfers OUT
  const { Transfer } = await import('../../../models/Transfer')
  const transferOutStats = await Transfer.aggregate([
    { $match: { status: 'completed', sourceLocationName: locName } },
    { $unwind: '$lineItems' },
    { $match: { 'lineItems.itemId': { $exists: true, $nin: [null, ''], $type: 'string' } } },
    {
      $group: {
        _id: '$lineItems.itemId',
        totalOut: { $sum: { $abs: '$lineItems.quantity' } }
      }
    }
  ])

  // 4. Transfers IN
  const transferInStats = await Transfer.aggregate([
    { $match: { status: 'completed', destinationLocationName: locName } },
    { $unwind: '$lineItems' },
    { $match: { 'lineItems.itemId': { $exists: true, $nin: [null, ''], $type: 'string' } } },
    {
      $group: {
        _id: '$lineItems.itemId',
        totalIn: { $sum: { $abs: '$lineItems.quantity' } }
      }
    }
  ])

  // Map everything
  const poMap = new Map(poStats.map(s => [String(s._id), s.totalPoQty]))
  const prepMap = new Map(prepStats.map(s => [s._id, s.totalPrepQty]))
  const tOutMap = new Map(transferOutStats.map(s => [String(s._id), s.totalOut]))
  const tInMap = new Map(transferInStats.map(s => [String(s._id), s.totalIn]))

  const inventory = items.map(item => {
    const poQty = poMap.get(String(item._id)) || 0
    const prepQty = prepMap.get(item.item) || 0
    const tOutQty = tOutMap.get(String(item._id)) || 0
    const tInQty = tInMap.get(String(item._id)) || 0

    // Net balance = POs - Preps - Transfers Out + Transfers In
    // Wait, prep uses quantity unit matching? Assume yes for now, similar to generic inventory logic
    const balance = poQty - prepQty - tOutQty + tInQty

    return {
      ...item,
      poQty,
      prepQty,
      tOutQty,
      tInQty,
      balance: Math.round(balance * 10000) / 10000 // avoid floating point issues
    }
  })

  // Filter to items with > 0 balance or include all if requested
  // We will return all, but include the balance for UI filtering.
  return {
    location: loc,
    inventory: inventory.filter(i => i.balance > 0)
  }
})
