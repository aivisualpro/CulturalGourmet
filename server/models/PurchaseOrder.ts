import mongoose, { type Document, Schema } from 'mongoose'

// ─── Sub-document: Vendor SKU Mapping ────────────────────────────────────────
export interface ISkuMapping {
  vendorSku: string        // e.g. "SAL225" from the invoice
  vendorSkuDescription: string // e.g. "SALMON ATL FIL DTRM SCALE 3-4#"
  ourItemId?: string       // Reference to CG_Items._id
  ourSku?: string          // e.g. "CG-SALMON-001"
  ourItemName?: string     // e.g. "Salmon Fillet"
  confirmedAt?: Date       // When the mapping was confirmed
}

// ─── Sub-document: Line Item ──────────────────────────────────────────────────
export interface ILineItem {
  lineNumber: number
  vendorItemCode: string        // Vendor's item code / SKU (e.g. "SAL225", "3078")
  description: string           // Full description from PDF
  quantity: number
  unit: string                  // e.g. "LBS", "CS", "EA"
  unitPrice: number
  taxAmount: number             // Per-line tax if present
  extendedPrice: number         // quantity × unitPrice
  pack?: string                 // e.g. "1", "3"
  size?: string                 // e.g. "42.5LB", "361LB"
  category?: string             // Grouping header from invoice (e.g. "DAIRY", "SEAFOOD")
  // SKU Linking
  mappedItemId?: string         // mongoose.Types.ObjectId as string
  mappedSku?: string
  mappedItemName?: string
  skuLinked: boolean
}

// ─── Sub-document: PDF Attachment ────────────────────────────────────────────
export interface IPdfAttachment {
  cloudinaryPublicId: string
  secureUrl: string             // HTTPS download URL
  originalFileName: string
  fileSizeBytes: number
  pageCount: number
  uploadedAt: Date
}

// ─── Main Document: PurchaseOrder ────────────────────────────────────────────
export interface IPurchaseOrder extends Document {
  // Status
  status: 'draft' | 'reviewed' | 'approved' | 'received' | 'cancelled'

  // Vendor
  vendorId?: string             // Reference to CG_Vendors._id
  vendorName: string            // Denormalised for display speed

  // Location
  locationId?: string           // Reference to CG_Locations._id
  locationName?: string         // Denormalised for display

  // Invoice Header (extracted from PDF)
  invoiceNumber: string
  invoiceDate?: Date
  deliveryDate?: Date
  paymentDueDate?: Date
  poNumber?: string             // Purchase Order # on the invoice
  orderNumber?: string          // Vendor's order/route number
  customerNumber?: string       // Vendor's customer account number

  // Sold To / Ship To
  soldToName?: string
  soldToAddress?: string
  shipToName?: string
  shipToAddress?: string

  // Line Items
  lineItems: ILineItem[]

  // Financials
  subTotal: number
  taxTotal: number
  otherCharges: number          // Fuel surcharge, env fee, etc.
  invoiceTotal: number
  totalItems: number            // Item count from invoice

  // PDF Source
  pdfAttachment?: IPdfAttachment
  rawExtractedText?: string     // Full PDF text for audit/re-processing

  // Meta
  notes?: string
  createdBy?: string            // User who uploaded
  reviewedAt?: Date
  approvedAt?: Date
  receivedAt?: Date

  createdAt: Date
  updatedAt: Date
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const LineItemSchema = new Schema<ILineItem>({
  lineNumber: { type: Number, default: 0 },
  vendorItemCode: { type: String, trim: true, default: '' },
  description: { type: String, trim: true, default: '' },
  quantity: { type: Number, default: 0 },
  unit: { type: String, trim: true, default: '' },
  unitPrice: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  extendedPrice: { type: Number, default: 0 },
  pack: { type: String, trim: true },
  size: { type: String, trim: true },
  category: { type: String, trim: true },
  mappedItemId: { type: String },
  mappedSku: { type: String, trim: true },
  mappedItemName: { type: String, trim: true },
  skuLinked: { type: Boolean, default: false },
}, { _id: true })

const PdfAttachmentSchema = new Schema<IPdfAttachment>({
  cloudinaryPublicId: { type: String, required: true },
  secureUrl: { type: String, required: true },
  originalFileName: { type: String, required: true },
  fileSizeBytes: { type: Number, default: 0 },
  pageCount: { type: Number, default: 1 },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false })

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    status: {
      type: String,
      enum: ['draft', 'reviewed', 'approved', 'received', 'cancelled'],
      default: 'draft',
    },
    vendorId: { type: String },
    vendorName: { type: String, required: true, trim: true },
    locationId: { type: String },
    locationName: { type: String, trim: true },
    invoiceNumber: { type: String, trim: true, default: '' },
    invoiceDate: { type: Date },
    deliveryDate: { type: Date },
    paymentDueDate: { type: Date },
    poNumber: { type: String, trim: true },
    orderNumber: { type: String, trim: true },
    customerNumber: { type: String, trim: true },
    soldToName: { type: String, trim: true },
    soldToAddress: { type: String, trim: true },
    shipToName: { type: String, trim: true },
    shipToAddress: { type: String, trim: true },
    lineItems: { type: [LineItemSchema], default: [] },
    subTotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    otherCharges: { type: Number, default: 0 },
    invoiceTotal: { type: Number, default: 0 },
    totalItems: { type: Number, default: 0 },
    pdfAttachment: { type: PdfAttachmentSchema },
    rawExtractedText: { type: String },
    notes: { type: String, trim: true },
    createdBy: { type: String, trim: true },
    reviewedAt: { type: Date },
    approvedAt: { type: Date },
    receivedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'CG_PurchaseOrders',
  },
)

// Indexes for fast querying
PurchaseOrderSchema.index({ vendorId: 1, status: 1 })
PurchaseOrderSchema.index({ invoiceNumber: 1, vendorId: 1 })
PurchaseOrderSchema.index({ invoiceDate: -1 })
PurchaseOrderSchema.index({ 'lineItems.vendorItemCode': 1, vendorId: 1 })

// ─── Vendor SKU Mapping (separate collection for persistence across POs) ───────
export interface IVendorSkuMap extends Document {
  vendorId: string
  vendorName: string
  vendorSku: string
  vendorSkuDescription: string
  ourItemId: string
  ourSku: string
  ourItemName: string
  createdAt: Date
  updatedAt: Date
}

const VendorSkuMapSchema = new Schema<IVendorSkuMap>(
  {
    vendorId: { type: String, required: true },
    vendorName: { type: String, trim: true, default: '' },
    vendorSku: { type: String, required: true, trim: true },
    vendorSkuDescription: { type: String, trim: true, default: '' },
    ourItemId: { type: String, required: true },
    ourSku: { type: String, trim: true, default: '' },
    ourItemName: { type: String, trim: true, default: '' },
  },
  {
    timestamps: true,
    collection: 'CG_VendorSkuMaps',
  },
)

VendorSkuMapSchema.index({ vendorId: 1, vendorSku: 1 }, { unique: true })

export const PurchaseOrder = mongoose.models.PurchaseOrder as mongoose.Model<IPurchaseOrder>
  || mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema)

export const VendorSkuMap = mongoose.models.VendorSkuMap as mongoose.Model<IVendorSkuMap>
  || mongoose.model<IVendorSkuMap>('VendorSkuMap', VendorSkuMapSchema)
