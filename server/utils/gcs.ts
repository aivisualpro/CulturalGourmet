import { Storage } from '@google-cloud/storage'

let storageClient: Storage | null = null

export function useGoogleCloudStorage() {
  if (!storageClient) {
    if (!process.env.GCS_PRIVATE_KEY) {
      console.warn('GCS WARNING: Using ADC or falling back safely because GCS_PRIVATE_KEY is missing.')
      storageClient = new Storage()
    } else {
      // Safely parse the private key by restoring escaped newlines
      const privateKey = process.env.GCS_PRIVATE_KEY.replace(/\\n/g, '\n')
      
      storageClient = new Storage({
        projectId: process.env.GCS_PROJECT_ID,
        credentials: {
          client_email: process.env.GCS_CLIENT_EMAIL,
          private_key: privateKey,
        },
      })
    }
  }
  return storageClient
}

export const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'culturegourmet'
