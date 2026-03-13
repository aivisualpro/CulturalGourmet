import mongoose, { type Document, Schema } from 'mongoose'

export interface IPrepItem extends Document {
  prepName: string
  recipe: string
  batchQty: number
  yieldQty: number
  createdAt: Date
  updatedAt: Date
}

const PrepItemSchema = new Schema<IPrepItem>(
  {
    prepName: { type: String, required: true, trim: true },
    recipe: { type: String, trim: true, default: '' },
    batchQty: { type: Number, default: null },
    yieldQty: { type: Number, default: null },
  },
  {
    timestamps: true,
    collection: 'CG_PrepList',
  },
)

export const PrepItem = mongoose.models.PrepItem as mongoose.Model<IPrepItem>
  || mongoose.model<IPrepItem>('PrepItem', PrepItemSchema)
