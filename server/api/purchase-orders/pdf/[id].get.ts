import { PurchaseOrder } from '~~/server/models/PurchaseOrder'
import { useCloudinary } from '~~/server/utils/cloudinary'

/**
 * GET /api/purchase-orders/pdf/:id
 * Generates a signed Cloudinary URL for the raw PDF and redirects to it.
 * Cloudinary restricts direct access to raw resources by default —
 * signing the URL server-side authenticates the request.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const po = await PurchaseOrder.findById(id).lean() as any
  if (!po) throw createError({ statusCode: 404, message: 'Purchase order not found' })

  const attachment = po.pdfAttachment
  if (!attachment?.cloudinaryPublicId) {
    throw createError({ statusCode: 404, message: 'No PDF attachment on this order' })
  }
  // Instead of signing and redirecting (which often causes 401s on raw/attachment flags due to strict signatures)
  // we proxy the file through the server to guarantee it downloads as an attachment.
  try {
    const response = await fetch(attachment.secureUrl)
    if (!response.ok) throw new Error('Failed to fetch from Cloudinary')

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    setResponseHeader(event, 'Content-Type', 'application/pdf')
    setResponseHeader(event, 'Content-Disposition', `attachment; filename="${attachment.originalFileName || `PO-${po.invoiceNumber || id}.pdf`}"`)
    
    return buffer
  } catch (error) {
    // Fallback to direct URL if our fetch proxy fails
    return sendRedirect(event, attachment.secureUrl, 302)
  }
})
