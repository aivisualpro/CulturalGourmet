import mongoose, { type Document, Schema } from 'mongoose'

export interface IFoodItem extends Document {
  sku: string
  vendor: mongoose.Types.ObjectId
  location: mongoose.Types.ObjectId
  description: mongoose.Types.ObjectId // linked to category
  item: string
  packSize: string
  unitQty: number
  caseQty: number
  unitPrice: number
  casePrice: number
  onHand: number
  par: number
  createdAt: Date
  updatedAt: Date
}

const FoodItemSchema = new Schema<IFoodItem>(
  {
    sku: { type: String, trim: true, default: '' },
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', default: null },
    location: { type: Schema.Types.ObjectId, ref: 'Location', default: null },
    description: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    item: { type: String, required: true, trim: true },
    packSize: { type: String, trim: true, default: '' },
    unitQty: { type: Number, default: 0 },
    caseQty: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    casePrice: { type: Number, default: 0 },
    onHand: { type: Number, default: 0 },
    par: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    collection: 'CG_FoodItems',
  },
)

export const FoodItem = mongoose.models.FoodItem as mongoose.Model<IFoodItem>
  || mongoose.model<IFoodItem>('FoodItem', FoodItemSchema)
