import { Item } from '../../models/Item'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  if (method === 'GET') {
    return await Item.find()
      .sort({ createdAt: -1 })
      .lean()
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

