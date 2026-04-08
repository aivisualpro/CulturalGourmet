import { useCloudinary, GALLERY_FOLDER } from '~~/server/utils/cloudinary'
import { parsePurchaseOrderPdf } from '~~/server/utils/pdfParser'

export default defineEventHandler(async (event: any) => {
  const body = await readBody(event)
  if (!body || !body.pdfUrl) {
    throw createError({ statusCode: 400, message: 'Missing pdfUrl from client. Cloudinary client-side upload must execute first.' })
  }

  const { pdfUrl, publicId, bytes, originalFileName } = body

  const cld = useCloudinary()
  // Cloudinary explicitly blocks arbitrary downloads of PDFs due to Strict Delivery settings.
  // We use our API Secret to generate an authenticated download URL.
  const authenticatedUrl = cld.url(publicId, { resource_type: 'raw', type: 'authenticated', sign_url: true })

  // Download the PDF file over the wire exclusively on the backend
  let buffer: Buffer
  try {
    const arrayBuffer = await $fetch<ArrayBuffer>(authenticatedUrl, { responseType: 'arrayBuffer' })
    buffer = Buffer.from(arrayBuffer)
  } catch (err: any) {
    throw createError({ statusCode: 500, message: `Failed to download strictly secured URL from Cloudinary: ${err?.message}` })
  }

  if (buffer.length > 50 * 1024 * 1024) {
    throw createError({ statusCode: 400, message: 'File too large (max 50 MB)' })
  }

  // ─── Parse PDF Text ──────────────────────────────────────
  let parsed
  try {
    parsed = await parsePurchaseOrderPdf(buffer, originalFileName || 'invoice.pdf')
  } catch (err: any) {
    throw createError({ statusCode: 422, message: `PDF parsing failed: ${err?.message || 'Unknown error'}` })
  }

  // Bind the existing Cloudinary reference into our standard attachment metadata packet
  const pdfAttachment = {
    cloudinaryPublicId: publicId,
    secureUrl: pdfUrl,
    originalFileName: originalFileName || 'invoice.pdf',
    fileSizeBytes: bytes || buffer.length,
    pageCount: parsed.pageCount || 1,
    uploadedAt: new Date(),
  }

  return { parsed, pdfAttachment }
})
