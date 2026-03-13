import mongoose, { type Document, Schema } from 'mongoose'

export interface IItem extends Document {
  itemSKU: string
  item: string
  category: string
  subCategory: string
  unit: string
  createdAt: Date
  updatedAt: Date
}

const ItemSchema = new Schema<IItem>(
  {
    itemSKU: { type: String, trim: true, default: '' },
    item: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: '' },
    subCategory: { type: String, trim: true, default: '' },
    unit: { type: String, trim: true, default: '' },
  },
  {
    timestamps: true,
    collection: 'CG_Items',
  },
)

export const Item = mongoose.models.Item as mongoose.Model<IItem>
  || mongoose.model<IItem>('Item', ItemSchema)
