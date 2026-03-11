import mongoose, { type Document, Schema } from 'mongoose'

// ─── Sub-document: Contact ───────────────────────────────────
export interface IContact {
  name: string
  email: string
  phone: string
}

const ContactSchema = new Schema<IContact>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
  },
  { _id: true },
)

// ─── Main Document: Vendor ───────────────────────────────────
export interface IVendor extends Document {
  vendorName: string
  address: string
  phone: string
  email: string
  contacts: IContact[]
  createdAt: Date
  updatedAt: Date
}

const VendorSchema = new Schema<IVendor>(
  {
    vendorName: { type: String, required: true, trim: true },
    address: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    contacts: { type: [ContactSchema], default: [] },
  },
  {
    timestamps: true,
    collection: 'CG_Vendors',
  },
)

// Prevent model re-compilation during HMR
export const Vendor = mongoose.models.Vendor as mongoose.Model<IVendor>
  || mongoose.model<IVendor>('Vendor', VendorSchema)
