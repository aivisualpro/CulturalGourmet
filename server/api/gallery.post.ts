import { useCloudinary, GALLERY_FOLDER } from '../utils/cloudinary'

export default defineEventHandler(async (event) => {
    const cld = useCloudinary()

    const form = await readMultipartFormData(event)
    if (!form || form.length === 0) {
        throw createError({ statusCode: 400, statusMessage: 'No file provided' })
    }

    const filePart = form.find(f => f.name === 'file')
    // targetSection: 'images' | 'videos' | 'menus' — sent by the frontend
    const targetSection = form.find(f => f.name === 'targetSection')?.data.toString() ?? ''

    if (!filePart?.data || !filePart.filename) {
        throw createError({ statusCode: 400, statusMessage: 'Missing file field' })
    }

    const mime = filePart.type ?? 'application/octet-stream'
    const ext = (filePart.filename.split('.').pop() ?? '').toLowerCase()

    const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'svg', 'heic'])
    const VIDEO_EXTS = new Set(['mp4', 'mov', 'webm', 'ogg', 'avi', 'mkv'])
    const PDF_EXTS = new Set(['pdf'])

    let resourceType: 'image' | 'video' | 'raw' = 'image'
    if (VIDEO_EXTS.has(ext) || mime.startsWith('video/')) resourceType = 'video'
    else if (PDF_EXTS.has(ext) || mime === 'application/pdf') resourceType = 'raw'

    // Determine target subfolder:
    // - If the frontend specifies a targetSection, honour it (e.g. image uploaded in Menus tab → PDFs folder)
    // - Otherwise fall back to resource-type-based auto-detection
    let targetSubfolder: string
    if (targetSection === 'menus') {
        targetSubfolder = 'PDFs'     // PDFs AND image menu scans both live here
    }
    else if (targetSection === 'images' && resourceType === 'image') {
        targetSubfolder = 'images'
    }
    else if (targetSection === 'videos' && resourceType === 'video') {
        targetSubfolder = 'videos'
    }
    else {
        // Auto-detect fallback
        targetSubfolder = resourceType === 'video' ? 'videos'
            : resourceType === 'raw' ? 'PDFs'
                : 'images'
    }

    const base64 = filePart.data.toString('base64')
    const dataUri = `data:${mime};base64,${base64}`
    const nameWithoutExt = filePart.filename.replace(/\.[^.]+$/, '')

    try {
        const result = await cld.uploader.upload(dataUri, {
            folder: `${GALLERY_FOLDER}/${targetSubfolder}`,
            resource_type: resourceType,
            use_filename: true,
            public_id: nameWithoutExt,
            unique_filename: true,
            overwrite: false,
        })

        return {
            publicId: result.public_id,
            url: result.secure_url,
            resourceType: result.resource_type,
            format: result.format,
            bytes: result.bytes,
            width: result.width,
            height: result.height,
        }
    }
    catch (err: any) {
        const msg = err?.message ?? 'Upload failed'
        if (msg.includes('File size too large') || err?.http_code === 400) {
            throw createError({ statusCode: 413, statusMessage: 'File too large for your Cloudinary plan (max 10 MB)' })
        }
        throw createError({ statusCode: 500, statusMessage: msg })
    }
})
