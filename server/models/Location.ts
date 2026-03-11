import mongoose, { type Document, Schema } from 'mongoose'

export interface ILocation extends Document {
  name: string
  address: string
  phone: string
  notes: string
  status: 'active' | 'inactive'
  createdAt: Date
  updatedAt: Date
}

const LocationSchema = new Schema<ILocation>(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  {
    timestamps: true,
    collection: 'CG_Locations',
  },
)

export const Location = mongoose.models.Location as mongoose.Model<ILocation>
  || mongoose.model<ILocation>('Location', LocationSchema)
