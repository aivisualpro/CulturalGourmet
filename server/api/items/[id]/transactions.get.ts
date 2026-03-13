import { Item } from '../../../models/Item'
import { Prep } from '../../../models/Prep'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const query = getQuery(event)

  // Fetch item details
  const item = await Item.findById(id).lean()
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Item not found' })

  // Build filter for prep entries matching this item name
  const prepFilter: Record<string, any> = { item: item.item }

  // Optional station filter
  if (query.station && query.station !== 'all') {
    prepFilter.station = query.station as string
  }

  // Fetch all prep entries for this item
  const preps = await Prep.find(prepFilter).sort({ date: 1, createdAt: 1 }).lean()

  // Fetch all stations that have transactions for this item
  const stationsWithData = await Prep.distinct('station', { item: item.item })

  return {
    item,
    transactions: preps,
    stations: stationsWithData.sort(),
  }
})
