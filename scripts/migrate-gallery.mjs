/**
 * One-time migration: uploads all local public/gallery files to Cloudinary.
 * Run with: node scripts/migrate-gallery.mjs
 *
 * Files are organised as:
 *   public/gallery/images/*  → "The Culture Gourmet/images"
 *   public/gallery/videos/*  → "The Culture Gourmet/videos"
 *   public/gallery/PDFs/*    → "The Culture Gourmet/PDFs"  (resource_type: raw)
 */

import { v2 as cloudinary } from 'cloudinary'
import { readdirSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

// ─── Load .env manually ───────────────────────────────────────────────────────
const __dir = fileURLToPath(new URL('..', import.meta.url))
const envPath = join(__dir, '.env')
if (existsSync(envPath)) {
    const lines = readFileSync(envPath, 'utf8').split('\n')
    for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const [key, ...rest] = trimmed.split('=')
        if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
    }
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_CLOUD_API_KEY,
    api_secret: process.env.CLOUDINARY_CLOUD_API_SECRET,
    secure: true,
})

const FOLDER = process.env.CLOUDINARY_CLOUD_API_FOLDER || 'The Culture Gourmet'
const PUBLIC_DIR = join(__dir, 'public', 'gallery')

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.svg', '.heic'])
const VIDEO_EXTS = new Set(['.mp4', '.mov', '.webm', '.ogg', '.avi', '.mkv'])
const PDF_EXTS = new Set(['.pdf'])

// ─── Helpers ──────────────────────────────────────────────────────────────────

function classify(filename) {
    const ext = extname(filename).toLowerCase()
    if (IMAGE_EXTS.has(ext)) return 'image'
    if (VIDEO_EXTS.has(ext)) return 'video'
    if (PDF_EXTS.has(ext)) return 'raw'
    return null
}

async function existsOnCloudinary(publicId, resourceType) {
    try {
        await cloudinary.api.resource(publicId, { resource_type: resourceType })
        return true
    }
    catch {
        return false
    }
}

async function uploadFile(filePath, cloudFolder, resourceType) {
    return cloudinary.uploader.upload(filePath, {
        folder: cloudFolder,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: false,
        overwrite: false,
    })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function migrate(localSubfolder, cloudSubfolder) {
    const dir = join(PUBLIC_DIR, localSubfolder)
    if (!existsSync(dir)) {
        console.log(`  ⚠️  Skipping "${localSubfolder}" — folder not found`)
        return
    }

    const files = readdirSync(dir).filter(f => !f.startsWith('.'))
    console.log(`\n📂  ${localSubfolder}  (${files.length} files)`)

    let uploaded = 0, skipped = 0, failed = 0

    for (const file of files) {
        const ext = extname(file).toLowerCase()
        const resourceType = classify(file)
        if (!resourceType) {
            console.log(`  ⏭  ${file}  (unsupported type)`)
            skipped++
            continue
        }

        const filePath = join(dir, file)
        const nameWithoutExt = file.replace(/\.[^.]+$/, '')
        const publicId = `${FOLDER}/${cloudSubfolder}/${nameWithoutExt}`

        // If resource type is 'raw', publicId includes extension
        const checkId = resourceType === 'raw' ? `${publicId}${ext}` : publicId

        const already = await existsOnCloudinary(checkId, resourceType)
        if (already) {
            console.log(`  ✓  ${file}  (already uploaded)`)
            skipped++
            continue
        }

        try {
            await uploadFile(filePath, `${FOLDER}/${cloudSubfolder}`, resourceType)
            console.log(`  ⬆  ${file}`)
            uploaded++
        }
        catch (err) {
            console.error(`  ✗  ${file}  — ${err.message}`)
            failed++
        }
    }

    console.log(`  Done: ${uploaded} uploaded, ${skipped} skipped, ${failed} failed`)
}

console.log('🚀  Migrating gallery to Cloudinary…')
console.log(`    Cloud:  ${process.env.CLOUDINARY_CLOUD_NAME}`)
console.log(`    Folder: ${FOLDER}\n`)

await migrate('images', 'images')
await migrate('videos', 'videos')
await migrate('PDFs', 'PDFs')

console.log('\n✅  Migration complete!')
