import { useCloudinary } from '~~/server/utils/cloudinary'

export default defineEventHandler(async (event: any) => {
  const query = getQuery(event)
  const publicId = query.publicId as string
  const filename = query.filename as string || 'document.pdf'

  if (!publicId) throw createError({ statusCode: 400, message: 'publicId required' })

  const cld = useCloudinary()
  // Generate strict delivery URL
  const signedUrl = cld.url(publicId, { resource_type: 'raw', type: 'authenticated', sign_url: true })

  try {
    const response = await fetch(signedUrl)
    if (!response.ok) throw new Error('Failed to fetch resource from Cloudinary - 401 Unauthorized or 404 Not Found')

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    setResponseHeader(event, 'Content-Type', 'application/pdf')
    // Use INLINE instead of ATTACHMENT to enable browser preview!
    setResponseHeader(event, 'Content-Disposition', `inline; filename="${filename}"`)

    return buffer
  } catch (error) {
    return sendRedirect(event, signedUrl, 302)
  }
})
