import { useGoogleCloudStorage, GCS_BUCKET_NAME } from '~~/server/utils/gcs'

export default defineEventHandler(async (event) => {
  const gcs = useGoogleCloudStorage()
  const bucket = gcs.bucket(GCS_BUCKET_NAME)

  try {
    // Permanently overwrite the Google Cloud Bucket's network policy to allow direct browser Streaming
    await bucket.setCorsConfiguration([
      {
        origin: ['*'], // Or specify your production/localhost URLs
        method: ['GET', 'PUT', 'POST', 'OPTIONS'],
        responseHeader: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin'],
        maxAgeSeconds: 3600,
      },
    ])
    return { success: true, message: `CORS policy successfully permanently applied to the '${GCS_BUCKET_NAME}' bucket!` }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message })
  }
})
