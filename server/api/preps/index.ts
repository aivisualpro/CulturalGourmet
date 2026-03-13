import { Prep } from '../../models/Prep'

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
    return await Prep.create(body)
  }
})
