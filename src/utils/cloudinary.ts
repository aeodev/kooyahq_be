import { v2 as cloudinary } from 'cloudinary'
import { env } from '../config/env'
import { Readable } from 'stream'

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
})

export type UploadFolder = 'posts' | 'profiles' | 'gallery' | 'cards' | 'rich-text-media' | 'meet-recordings'

export interface UploadResult {
  url: string
  publicId: string
  secureUrl: string
}

export async function uploadToCloudinary(
  buffer: Buffer,
  folder: UploadFolder,
  publicId?: string,
  resourceType: 'image' | 'video' | 'auto' = 'image'
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) {
          reject(error)
        } else if (result) {
          resolve({
            url: result.url || (result as any).secure_url,
            publicId: result.public_id,
            secureUrl: result.secure_url,
          })
        } else {
          reject(new Error('Upload failed: no result'))
        }
      }
    )

    const readable = new Readable()
    readable.push(buffer)
    readable.push(null)
    readable.pipe(uploadStream)
  })
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })
}

export function extractPublicIdFromUrl(url: string): string | null {
  try {
    // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{folder}/{public_id}.{ext}
    const urlParts = url.split('/')
    const uploadIndex = urlParts.findIndex(part => part === 'upload')
    if (uploadIndex === -1) return null
    
    // Skip version (v1234567890) and get everything after
    const afterUpload = urlParts.slice(uploadIndex + 1)
    if (afterUpload.length === 0) return null
    
    // First part after upload is usually version (v1234567890), skip it
    const startIndex = afterUpload[0]?.startsWith('v') ? 1 : 0
    const publicIdParts = afterUpload.slice(startIndex)
    if (publicIdParts.length === 0) return null
    
    const publicIdWithExt = publicIdParts.join('/')
    // Remove file extension
    return publicIdWithExt.replace(/\.[^/.]+$/, '')
  } catch {
    return null
  }
}

