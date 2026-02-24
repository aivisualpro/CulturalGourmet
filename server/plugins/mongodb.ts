import mongoose from 'mongoose'

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig()
  const uri = config.mongodbUri as string

  if (!uri) {
    console.warn('[MongoDB] No MONGODB_URI configured, skipping connection')
    return
  }

  try {
    await mongoose.connect(uri)
    console.log('[MongoDB] Connected successfully')
  }
  catch (err) {
    console.error('[MongoDB] Connection error:', err)
  }
})
