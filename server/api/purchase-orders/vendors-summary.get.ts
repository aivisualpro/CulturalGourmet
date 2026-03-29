import { PurchaseOrder } from '~~/server/models/PurchaseOrder'
import { requireAuth } from '~~/server/utils/auth' // Or whatever auth middleware is used

export default defineEventHandler(async (event) => {
  // Aggregate purchase orders by vendorId
  const summary = await PurchaseOrder.aggregate([
    {
      $group: {
        _id: "$vendorId",
        vendorName: { $first: "$vendorName" },
        totalOrders: { $sum: 1 },
        totalSum: { $sum: "$invoiceTotal" }
      }
    },
    { $sort: { vendorName: 1 } }
  ])

  return summary.map(v => ({
    vendorId: v._id,
    vendorName: v.vendorName || 'Unknown Vendor',
    totalOrders: v.totalOrders,
    totalSum: v.totalSum || 0
  }))
})
