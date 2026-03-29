import mongoose, { type Document, Schema } from 'mongoose'

export interface IPrep extends Document {
  date: Date
  station: string
  item: string
  description: string
  qty: number
  unit: string
  consumedItems: {
    itemName: string
    quantity: number
    unit: string
  }[]
  createdAt: Date
  updatedAt: Date
}

const PrepSchema = new Schema<IPrep>(
  {
    date: { type: Date, required: true },
    station: { type: String, required: true, trim: true },
    item: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    qty: { type: Number, default: null },
    unit: { type: String, trim: true, default: '' },
    consumedItems: [
      {
        itemName: { type: String, required: true },
        quantity: { type: Number, required: true },
        unit: { type: String, default: '' },
      }
    ]
  },
  {
    timestamps: true,
    collection: 'CG_Preps',
  },
)

PrepSchema.index({ date: -1, station: 1 })

export const Prep = mongoose.models.Prep as mongoose.Model<IPrep>
  || mongoose.model<IPrep>('Prep', PrepSchema)

