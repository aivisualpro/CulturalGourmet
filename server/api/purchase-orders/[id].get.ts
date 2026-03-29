import { PurchaseOrder } from '~~/server/models/PurchaseOrder'
import { Location } from '~~/server/models/Location'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const po = await PurchaseOrder.findById(id).lean()
  if (!po) throw createError({ statusCode: 404, message: 'Purchase order not found' })
    
  // Resolve locationName from locationId if missing
  if (!po.locationName && po.locationId) {
    const loc = await Location.findById(po.locationId).lean()
    if (loc) po.locationName = loc.name
  }

  return po
})
