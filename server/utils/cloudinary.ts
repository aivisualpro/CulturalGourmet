import { v2 as cld } from 'cloudinary'

let _configured = false

export function useCloudinary() {
    if (!_configured) {
        cld.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_CLOUD_API_KEY,
            api_secret: process.env.CLOUDINARY_CLOUD_API_SECRET,
            secure: true,
        })
        _configured = true
    }
    return cld
}

export const GALLERY_FOLDER = process.env.CLOUDINARY_CLOUD_API_FOLDER || 'The Culture Gourmet'

// ─── URL builders ─────────────────────────────────────────────────────────────

export function imageThumbUrl(publicId: string): string {
    const c = useCloudinary()
    return c.url(publicId, {
        secure: true,
        transformation: [
            { width: 600, height: 450, crop: 'fill', gravity: 'auto' },
            { quality: 'auto:low', fetch_format: 'auto' },
        ],
    })
}

export function imageFullUrl(publicId: string): string {
    const c = useCloudinary()
    return c.url(publicId, {
        secure: true,
        transformation: [
            { width: 1600, quality: 'auto', fetch_format: 'auto' },
        ],
    })
}

export function videoThumbUrl(publicId: string): string {
    const c = useCloudinary()
    return c.url(publicId, {
        secure: true,
        resource_type: 'video',
        format: 'jpg',
        transformation: [
            { width: 800, height: 450, crop: 'fill', start_offset: '0', quality: 'auto' },
        ],
    })
}

export function videoStreamUrl(publicId: string): string {
    const c = useCloudinary()
    return c.url(publicId, {
        secure: true,
        resource_type: 'video',
        transformation: [
            { quality: 'auto' },
        ],
    })
}

// ─── Paginated fetch ──────────────────────────────────────────────────────────

export async function fetchAllResources(resourceType: string, prefix: string) {
    const c = useCloudinary()
    const all: any[] = []
    let cursor: string | undefined

    do {
        const res: any = await c.api.resources({
            type: 'upload',
            resource_type: resourceType,
            prefix,
            max_results: 500,
            next_cursor: cursor,
        })
        all.push(...(res.resources ?? []))
        cursor = res.next_cursor
    } while (cursor)

    return all
}
