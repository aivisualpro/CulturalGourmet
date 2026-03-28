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

  const cld = useCloudinary()

  // Generate a signed URL — this authenticates the request so Cloudinary serves the file
  const signedUrl = cld.url(attachment.cloudinaryPublicId, {
    secure: true,
    resource_type: 'raw',
    type: 'upload',
    sign_url: true,
  })

  return sendRedirect(event, signedUrl, 302)
})
