import { useCloudinary, GALLERY_FOLDER } from '~~/server/utils/cloudinary'

export default defineEventHandler((event: any) => {
    // Ensure initialized
    const cld = useCloudinary()
    const query = getQuery(event)
    const subfolder = query.subfolder ? `/${query.subfolder}` : ''
    const folderName = `${GALLERY_FOLDER}${subfolder}`
    const timestamp = Math.round((new Date).getTime() / 1000)

    const paramsToSign = {
        timestamp,
        folder: folderName
    }

    const signature = cld.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_CLOUD_API_SECRET!)

    return {
        timestamp,
        signature,
        apiKey: process.env.CLOUDINARY_CLOUD_API_KEY,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        folder: folderName
    }
})
