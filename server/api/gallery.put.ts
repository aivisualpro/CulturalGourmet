import { useCloudinary, GALLERY_FOLDER } from '../utils/cloudinary'

// PUT /api/gallery  — Move a file between sections
// Body: { publicId, resourceType, toSection }
// toSection: 'images' | 'videos' | 'menus'
// Valid moves: image ↔ menus (same resource_type: image, different folder)

export default defineEventHandler(async (event) => {
    const cld = useCloudinary()

    const body = await readBody(event) as {
        publicId: string
        resourceType: 'image' | 'video' | 'raw'
        toSection: 'images' | 'videos' | 'menus'
    }

    const { publicId, resourceType, toSection } = body

    if (!publicId || !resourceType || !toSection) {
        throw createError({ statusCode: 400, statusMessage: 'Missing publicId, resourceType or toSection' })
    }

    // Only image ↔ menus moves are supported.
    // Videos are resource_type:video and PDFs are resource_type:raw — both are
    // isolated types that can't be renamed into a different resource class.
    if (resourceType !== 'image') {
        throw createError({
            statusCode: 422,
            statusMessage: 'Only photo files can be moved between sections',
        })
    }

    if (toSection === 'videos') {
        throw createError({
            statusCode: 422,
            statusMessage: 'Photo files cannot be moved to the Videos section',
        })
    }

    // Map section name → Cloudinary subfolder
    const folderMap: Record<string, string> = {
        images: 'images',
        menus: 'PDFs',
        videos: 'videos',
    }

    const targetFolder = folderMap[toSection]
    if (!targetFolder) {
        throw createError({ statusCode: 400, statusMessage: `Unknown target section: ${toSection}` })
    }

    // Derive the filename without any existing folder prefix
    const fileName = publicId.split('/').pop()
    if (!fileName) {
        throw createError({ statusCode: 400, statusMessage: 'Could not parse publicId' })
    }

    const newPublicId = `${GALLERY_FOLDER}/${targetFolder}/${fileName}`

    if (newPublicId === publicId) {
        return { success: true, unchanged: true, publicId }
    }

    try {
        await cld.uploader.rename(publicId, newPublicId, {
            resource_type: resourceType,
            invalidate: true,
            overwrite: false,
        })
        return { success: true, newPublicId }
    }
    catch (err: any) {
        throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Move failed' })
    }
})
