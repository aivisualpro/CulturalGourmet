import { parsePurchaseOrderPdf } from '~~/server/utils/pdfParser'
import { useGoogleCloudStorage } from '~~/server/utils/gcs'

export default defineEventHandler(async (event: any) => {
  const body = await readBody(event)

  const { bucket, filename, bytes, originalFileName } = body

  const gcs = useGoogleCloudStorage()
  const fileRef = gcs.bucket(bucket).file(filename)

  // Download the PDF file over the wire from GCS seamlessly
  let buffer: Buffer
  try {
    const [fileBuffer] = await fileRef.download()
    buffer = fileBuffer
  } catch (err: any) {
    throw createError({ statusCode: 500, message: `Failed to download secure URL from Google Cloud Bucket: ${err?.message}` })
  }

  if (buffer.length > 50 * 1024 * 1024) {
    throw createError({ statusCode: 413, message: 'File is too large visually even for backend limits (max 50MB).' })
  }

  // ─── Parse PDF Text ──────────────────────────────────────
  let parsed
  try {
    parsed = await parsePurchaseOrderPdf(buffer, originalFileName || 'invoice.pdf')
  } catch (err: any) {
    throw createError({ statusCode: 422, message: `PDF parsing failed: ${err?.message || 'Unknown error'}` })
  }

  // Bind the GCS reference into our standard attachment metadata packet to not break the schema
  const pdfAttachment = {
    cloudinaryPublicId: filename, // Repurposing field seamlessly
    secureUrl: `https://storage.googleapis.com/${bucket}/${filename}`,
    originalFileName: originalFileName || 'invoice.pdf',
    fileSizeBytes: bytes || buffer.length,
    pageCount: parsed.pageCount || 1,
    uploadedAt: new Date(),
  }

  return { parsed, pdfAttachment }
})
