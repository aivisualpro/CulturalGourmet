import { Consumption } from '../../models/Consumption'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  // GET /api/consumptions?from=...&to=...&date=...
  if (method === 'GET') {
    const query = getQuery(event)

    const filter: Record<string, any> = {}

    // Single date filter
    if (query.date) {
      const d = new Date(query.date as string)
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      filter.date = { $gte: start, $lt: end }
    }

    // Range filter (for weekly reports)
    if (query.from && query.to) {
      const from = new Date(query.from as string)
      const to = new Date(query.to as string)
      const toEnd = new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1)
      filter.date = { $gte: from, $lt: toEnd }
    }

    return await Consumption.find(filter).sort({ date: -1, category: 1 }).lean()
  }

  // POST /api/consumptions
  if (method === 'POST') {
    const body = await readBody(event)
    return await Consumption.create(body)
  }
})
