import mongoose, { type Document, Schema } from 'mongoose'

// ─── Sub-document: Contact ───────────────────────────────────
export interface IContact {
  contactPerson: string
  emails: string[]
  phones: string[]
  addresses: string[]
  designation?: string
  department?: string
  status: 'active' | 'inactive'
}

const ContactSchema = new Schema<IContact>(
  {
    contactPerson: { type: String, required: true, trim: true },
    emails: { type: [String], default: [] },
    phones: { type: [String], default: [] },
    addresses: { type: [String], default: [] },
    designation: { type: String, trim: true },
    department: { type: String, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { _id: true },
)

// ─── Main Document: Vendor ───────────────────────────────────
export interface IVendor extends Document {
  vendorName: string
  contacts: IContact[]
  createdAt: Date
  updatedAt: Date
}

const VendorSchema = new Schema<IVendor>(
  {
    vendorName: { type: String, required: true, trim: true },
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
