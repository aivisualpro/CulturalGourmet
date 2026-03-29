import mongoose, { type Document, Schema } from 'mongoose'

export interface ITransfer extends Document {
  date: Date
  sourceLocationId: string
  sourceLocationName: string
  destinationLocationId: string
  destinationLocationName: string
  status: 'draft' | 'completed'
  notes: string
  lineItems: {
    lineNumber: number
    itemId: string
    itemSKU: string
    itemName: string
    quantity: number
    unit: string
  }[]
  totalItems: number
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const TransferSchema = new Schema<ITransfer>(
  {
    date: { type: Date, required: true, default: Date.now },
    sourceLocationId: { type: String, required: true },
    sourceLocationName: { type: String, required: true },
    destinationLocationId: { type: String, required: true },
    destinationLocationName: { type: String, required: true },
    status: { type: String, enum: ['draft', 'completed'], default: 'completed' },
    notes: { type: String, default: '' },
    lineItems: [
      {
        lineNumber: { type: Number },
        itemId: { type: String, required: true },
        itemSKU: { type: String, default: '' },
        itemName: { type: String, required: true },
        quantity: { type: Number, required: true, min: 0.0001 },
        unit: { type: String, default: '' },
      },
    ],
    totalItems: { type: Number, default: 0 },
    createdBy: { type: String, default: 'System' },
  },
  {
    timestamps: true,
    collection: 'CG_Transfers',
  }
)

export const Transfer = mongoose.models.Transfer || mongoose.model<ITransfer>('Transfer', TransferSchema)
