import {
    useCloudinary,
    GALLERY_FOLDER,
    fetchAllResources,
    imageThumbUrl,
    imageFullUrl,
    videoThumbUrl,
    videoStreamUrl,
} from '../utils/cloudinary'

function resourceName(publicId: string) {
    return decodeURIComponent(publicId.split('/').pop() ?? publicId)
        .replace(/\.[^.]+$/, '') // strip extension
}

export default defineEventHandler(async () => {
    useCloudinary()

    const [imgRes, vidRes, pdfRawRes, pdfImgRes] = await Promise.all([
        fetchAllResources('image', `${GALLERY_FOLDER}/images`),
        fetchAllResources('video', `${GALLERY_FOLDER}/videos`),
        fetchAllResources('raw', `${GALLERY_FOLDER}/PDFs`).catch(() => []),
        // Images physically stored in the PDFs folder = menu photo scans moved there
        fetchAllResources('image', `${GALLERY_FOLDER}/PDFs`).catch(() => []),
    ])

    // Menus = raw PDFs + image files that live in the PDFs folder
    const pdfRes = [...pdfRawRes, ...pdfImgRes]

    return {
        images: imgRes.map((r: any) => ({
            thumb: imageThumbUrl(r.public_id),
            url: imageFullUrl(r.public_id),
            publicId: r.public_id,
            name: resourceName(r.public_id),
            width: r.width as number | undefined,
            height: r.height as number | undefined,
            resourceType: 'image' as const,
        })),

        videos: vidRes.map((r: any) => ({
            thumb: videoThumbUrl(r.public_id),
            url: videoStreamUrl(r.public_id),
            publicId: r.public_id,
            name: resourceName(r.public_id),
            width: r.width as number | undefined,
            height: r.height as number | undefined,
            resourceType: 'video' as const,
        })),

        pdfs: pdfRes.map((r: any) => ({
            // For raw PDFs: direct URL. For moved images in PDFs folder: use CDN image URL.
            url: r.resource_type === 'image' ? imageFullUrl(r.public_id) : r.secure_url as string,
            thumb: r.resource_type === 'image' ? imageThumbUrl(r.public_id) : undefined,
            publicId: r.public_id as string,
            name: resourceName(r.public_id),
            resourceType: r.resource_type as 'image' | 'raw',
        })),
    }
})
