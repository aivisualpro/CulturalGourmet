import { useGoogleCloudStorage, GCS_BUCKET_NAME } from '~~/server/utils/gcs'

export default defineEventHandler(async (event: any) => {
  const query = getQuery(event)
  const filename = query.filename as string
  const contentType = query.contentType as string || 'application/pdf'

  if (!filename) {
    throw createError({ statusCode: 400, message: 'filename query parameter is required' })
  }

  const gcs = useGoogleCloudStorage()
  const bucket = gcs.bucket(GCS_BUCKET_NAME)
  
  // Use a unique file path
  const uniqueName = `purchase-orders/${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`
  const file = bucket.file(uniqueName)

  // Generate a signed URL for a direct PUT upload
  const [signedUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000, // 15 mins
    contentType,
  })

  return {
    url: signedUrl,
    filename: uniqueName,
    bucket: GCS_BUCKET_NAME
  }
})
