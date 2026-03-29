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

  const isLegacyRaw = attachment.secureUrl.includes('/raw/upload/')

  if (isLegacyRaw) {
    // Legacy files were uploaded as 'raw' which may have account restrictions.
    // We try to sign the URL to bypass the restriction, but if it 401s, 
    // the user will need to re-upload the PO.
    const signedUrl = cld.url(attachment.cloudinaryPublicId, {
      secure: true,
      resource_type: 'raw',
      type: 'upload',
      sign_url: true,
    })
    return sendRedirect(event, signedUrl, 302)
  }

  // New files are uploaded as 'image' to bypass the global restriction on raw files.
  // We can just generate a direct secure URL for the 'image' resource as a PDF.
  const signedUrl = cld.url(attachment.cloudinaryPublicId, {
    secure: true,
    resource_type: 'image',
    type: 'upload',
    format: 'pdf',
    sign_url: true, // Just in case they enabled strict signature on everything
  })

  return sendRedirect(event, signedUrl, 302)
})
