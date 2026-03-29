import mongoose, { type Document, Schema } from 'mongoose'

export interface IConsumption extends Document {
  date: Date
  station: string
  category: string
  subCategory: string
  qty: number
  cost: number
  amount: number
  remarks: string
  createdAt: Date
  updatedAt: Date
}

const ConsumptionSchema = new Schema<IConsumption>(
  {
    date: { type: Date, required: true },
    station: { type: String, trim: true, default: '' },
    category: { type: String, required: true, trim: true },
    subCategory: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, min: 0, default: 1 },
    cost: { type: Number, required: true, min: 0, default: 0 },
    amount: { type: Number, required: true, min: 0 },
    remarks: { type: String, default: '', trim: true },
  },
  {
    timestamps: true,
    collection: 'CG_Consumptions',
  },
)

// Compound index for efficient weekly/daily queries
ConsumptionSchema.index({ date: 1, category: 1 })

export const Consumption = mongoose.models.Consumption as mongoose.Model<IConsumption>
  || mongoose.model<IConsumption>('Consumption', ConsumptionSchema)
