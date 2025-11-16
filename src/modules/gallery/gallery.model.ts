import { Schema, model, models, type Document } from 'mongoose'

export interface GalleryDocument extends Document {
  title: string
  description?: string
  filename: string
  path: string
  mimetype: string
  size: number
  uploadedBy: string
  createdAt: Date
  updatedAt: Date
}

const gallerySchema = new Schema<GalleryDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    filename: {
      type: String,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    mimetype: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    uploadedBy: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
)

gallerySchema.index({ createdAt: -1 })

export const GalleryModel = models.Gallery ?? model<GalleryDocument>('Gallery', gallerySchema)

export type GalleryItem = {
  id: string
  title: string
  description?: string
  filename: string
  path: string
  imageUrl: string
  mimetype: string
  size: number
  uploadedBy: string
  createdAt: string
  updatedAt: string
}

export function toGalleryItem(doc: GalleryDocument, baseUrl: string = ''): GalleryItem {
  const createdAt = doc.createdAt instanceof Date 
    ? doc.createdAt.toISOString() 
    : new Date(doc.createdAt as any).toISOString()
  
  const updatedAt = doc.updatedAt instanceof Date 
    ? doc.updatedAt.toISOString() 
    : new Date(doc.updatedAt as any).toISOString()

  // If path is a Cloudinary URL, use it directly; otherwise fall back to old format for backward compatibility
  const imageUrl = doc.path.startsWith('http') ? doc.path : `${baseUrl}/gallery/files/${doc.filename}`

  return {
    id: doc.id,
    title: doc.title,
    description: doc.description,
    filename: doc.filename,
    path: doc.path,
    imageUrl,
    mimetype: doc.mimetype,
    size: doc.size,
    uploadedBy: doc.uploadedBy,
    createdAt,
    updatedAt,
  }
}

