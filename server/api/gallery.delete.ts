import { useCloudinary } from '../utils/cloudinary'

export default defineEventHandler(async (event) => {
    const { publicId, resourceType } = getQuery(event) as {
        publicId?: string
        resourceType?: string
    }

    if (!publicId || typeof publicId !== 'string') {
        throw createError({ statusCode: 400, statusMessage: 'Missing publicId parameter' })
    }

    const type = (resourceType as 'image' | 'video' | 'raw') ?? 'image'
    if (!['image', 'video', 'raw'].includes(type)) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid resourceType' })
    }

    const cld = useCloudinary()

    await cld.uploader.destroy(publicId, { resource_type: type, invalidate: true })

    return { success: true, deleted: publicId }
})
