import { useCloudinary } from '~~/server/utils/cloudinary'
import { useGoogleCloudStorage, GCS_BUCKET_NAME } from '~~/server/utils/gcs'

export default defineEventHandler(async (event: any) => {
  const query = getQuery(event)
  const publicId = query.publicId as string
  const filename = query.filename as string || 'document.pdf'

  if (!publicId) throw createError({ statusCode: 400, message: 'publicId required' })

  // Route to GCS for newly vaulted documents
  if (publicId.includes('purchase-orders/')) {
    const gcs = useGoogleCloudStorage()
    const file = gcs.bucket(GCS_BUCKET_NAME).file(publicId)
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour preview token
    })
    return sendRedirect(event, signedUrl, 302)
  }

  // Route back to original secure schema for historic legacy documents
  const cld = useCloudinary()
  const signedUrl = cld.url(publicId, { resource_type: 'raw', type: 'authenticated', sign_url: true })

  try {
    const response = await fetch(signedUrl)
    if (!response.ok) throw new Error('Failed to fetch legacy resource from Cloudinary')

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    setResponseHeader(event, 'Content-Type', 'application/pdf')
    setResponseHeader(event, 'Content-Disposition', `inline; filename="${filename}"`)

    return buffer
  } catch (error) {
    return sendRedirect(event, signedUrl, 302)
  }
})
