import { useCloudinary, GALLERY_FOLDER } from '~~/server/utils/cloudinary'
import { parsePurchaseOrderPdf } from '~~/server/utils/pdfParser'

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)
  if (!formData) throw createError({ statusCode: 400, message: 'No form data' })

  const filePart = formData.find(f => f.name === 'file')
  if (!filePart || !filePart.data) throw createError({ statusCode: 400, message: 'No PDF file uploaded' })

  const originalFileName = filePart.filename || 'invoice.pdf'
  const buffer = filePart.data

  if (buffer.length > 50 * 1024 * 1024) {
    throw createError({ statusCode: 400, message: 'File too large (max 50 MB)' })
  }

  // ─── Parse PDF Text ──────────────────────────────────────
  let parsed
  try {
    parsed = await parsePurchaseOrderPdf(buffer, originalFileName)
  }
  catch (err: any) {
    throw createError({ statusCode: 422, message: `PDF parsing failed: ${err?.message || 'Unknown error'}` })
  }

  // ─── Upload to Cloudinary as raw (downloadable PDF) ──────
  let pdfAttachment: any = null
  try {
    const cld = useCloudinary()
    const folder = `${GALLERY_FOLDER}/purchase-orders`

    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cld.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          use_filename: true,
          unique_filename: true,
          access_mode: 'public',
          type: 'upload',
          format: 'pdf',
        },
        (error: any, result: any) => {
          if (error) reject(error)
          else resolve(result)
        },
      )
      uploadStream.end(buffer)
    })

    pdfAttachment = {
      cloudinaryPublicId: uploadResult.public_id,
      secureUrl: uploadResult.secure_url,
      originalFileName,
      fileSizeBytes: buffer.length,
      pageCount: parsed.pageCount,
      uploadedAt: new Date(),
    }
  }
  catch (err: any) {
    console.error('[PO Upload] Cloudinary error:', err?.message)
    pdfAttachment = null
  }

  return { parsed, pdfAttachment }
})
