import { Item } from '../../../models/Item'
import { Prep } from '../../../models/Prep'
import { PurchaseOrder } from '../../../models/PurchaseOrder'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const query = getQuery(event)

  // Fetch item details
  const item = await Item.findById(id).lean()
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Item not found' })

  // Build filter for prep entries matching this item name inside consumedItems
  const prepFilter: Record<string, any> = { 'consumedItems.itemName': item.item }

  // Optional station filter
  const stationFilter = (query.station && query.station !== 'all') ? query.station as string : null
  if (stationFilter) {
    prepFilter.station = stationFilter
  }

  // Fetch all prep entries for this item
  const rawPreps = await Prep.find(prepFilter).lean()
  
  const stationSet = new Set<string>()
  const preps = rawPreps.map(p => {
    if (p.station) stationSet.add(p.station)
    
    // Find the consumed qty for this specific item
    const consumed = p.consumedItems?.find((c: any) => c.itemName === item.item)
    const qtyConsumed = consumed?.quantity || 0

    return {
      _id: String(p._id),
      type: 'prep',
      station: p.station || 'Prep',
      qty: -Math.abs(qtyConsumed), // OUT transaction
      date: p.date,
      createdAt: p.createdAt,
      description: `Prep: ${p.item}${p.description ? ' - ' + p.description : ''}`,
      unit: consumed?.unit || item.unit
    }
  })

  // Fetch pos
  const poQuery: Record<string, any> = {
    status: { $in: ['approved', 'received'] },
    'lineItems.mappedItemId': id
  }
  const pos = await PurchaseOrder.find(poQuery).select('status locationId locationName vendorName invoiceNumber invoiceDate lineItems createdAt').lean()
  
  // Pre-fetch locations to resolve any missing locationNames
  const { Location } = await import('../../../models/Location')
  const locs = await Location.find().lean()
  const locMap = new Map(locs.map(l => [String(l._id), l.name]))
  
  const poTransactions: any[] = []
  for (const po of pos) {
    // Resolve location
    let stationLabel = po.locationName
    if (!stationLabel && po.locationId) {
      stationLabel = locMap.get(po.locationId)
    }
    stationLabel = stationLabel || '—'

    // If we have a station filter and the PO's destination doesn't match, skip
    if (stationFilter && stationLabel !== stationFilter) {
      continue
    }

    const matchedLines = (po.lineItems || []).filter((li: any) => String(li.mappedItemId) === String(id))
    for (const li of matchedLines) {
      if (stationLabel !== '—') stationSet.add(stationLabel)
      poTransactions.push({
        _id: String(po._id) + '-' + li.lineNumber,
        type: 'po',
        station: stationLabel,
        qty: li.quantity || 0,
        date: po.invoiceDate ? new Date(po.invoiceDate) : po.createdAt,
        createdAt: po.createdAt,
        description: `PO ${po.invoiceNumber || '—'} from ${po.vendorName}`,
        unit: li.unit || item.unit
      })
    }
  }

  // Fetch Transfers involving this item
  const { Transfer } = await import('../../../models/Transfer')
  const transfers = await Transfer.find({
    status: 'completed',
    'lineItems.itemId': id
  }).lean()

  const transferTransactions: any[] = []
  for (const t of transfers) {
    const matchedLines = (t.lineItems || []).filter((li: any) => String(li.itemId) === String(id))
    for (const li of matchedLines) {
      const u = li.unit || item.unit

      // Record OUT transaction for source location
      if (!stationFilter || stationFilter === t.sourceLocationName) {
        if (t.sourceLocationName && t.sourceLocationName !== '—') stationSet.add(t.sourceLocationName)
        transferTransactions.push({
          _id: String(t._id) + '-out-' + li.lineNumber,
          type: 'transferred',
          station: t.sourceLocationName,
          sourceLocation: `Transferred to ${t.destinationLocationName}`,
          qty: -Math.abs(li.quantity),
          date: t.date || t.createdAt,
          createdAt: t.createdAt,
          description: `Transfer to ${t.destinationLocationName}`,
          unit: u
        })
      }

      // Record IN transaction for destination location
      if (!stationFilter || stationFilter === t.destinationLocationName) {
        if (t.destinationLocationName && t.destinationLocationName !== '—') stationSet.add(t.destinationLocationName)
        transferTransactions.push({
          _id: String(t._id) + '-in-' + li.lineNumber,
          type: 'transferred',
          station: t.destinationLocationName,
          sourceLocation: `Transferred from ${t.sourceLocationName}`,
          qty: Math.abs(li.quantity),
          date: t.date || t.createdAt,
          createdAt: t.createdAt,
          description: `Transfer from ${t.sourceLocationName}`,
          unit: u
        })
      }
    }
  }

  const transactions = [...preps, ...poTransactions, ...transferTransactions].sort((a, b) => {
    const da = new Date(a.date || a.createdAt).getTime()
    const db = new Date(b.date || b.createdAt).getTime()
    if (da !== db) return da - db
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  return {
    item,
    transactions,
    stations: Array.from(stationSet).sort(),
  }
})
