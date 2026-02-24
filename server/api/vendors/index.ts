import { Vendor } from '../../models/Vendor'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  // GET /api/vendors — list all vendors
  if (method === 'GET') {
    const vendors = await Vendor.find().sort({ createdAt: -1 }).lean()
    return vendors
  }

  // POST /api/vendors — create a new vendor
  if (method === 'POST') {
    const body = await readBody(event)
    const vendor = await Vendor.create(body)
    return vendor
  }
})
