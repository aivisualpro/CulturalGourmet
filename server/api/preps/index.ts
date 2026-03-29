import { Prep } from '../../models/Prep'
import { expandPrepItemToIngredients } from '../../utils/recipe-expansion'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  // GET /api/preps?station=...
  if (method === 'GET') {
    const query = getQuery(event)
    const filter: Record<string, any> = {}

    if (query.station) {
      filter.station = query.station as string
    }

    return await Prep.find(filter).sort({ date: -1, station: 1 }).lean()
  }

  // POST /api/preps
  if (method === 'POST') {
    const body = await readBody(event)
    body.consumedItems = await expandPrepItemToIngredients(body.item, body.qty || 1)
    return await Prep.create(body)
  }
})
