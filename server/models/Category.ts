import mongoose, { type Document, Schema } from 'mongoose'

// ─── Sub-document: SubCategory ───────────────────────────────
export interface ISubCategory {
  name: string
  status: 'active' | 'inactive'
}

const SubCategorySchema = new Schema<ISubCategory>(
  {
    name: { type: String, required: true, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { _id: true },
)

// ─── Main Document: Category ─────────────────────────────────
export interface ICategory extends Document {
  name: string
  icon: string
  color: string
  description: string
  subCategories: ISubCategory[]
  status: 'active' | 'inactive'
  createdAt: Date
  updatedAt: Date
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    icon: { type: String, default: '' },
    color: { type: String, default: '' },
    description: { type: String, default: '', trim: true },
    subCategories: { type: [SubCategorySchema], default: [] },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  {
    timestamps: true,
    collection: 'CG_Categories',
  },
)

export const Category = mongoose.models.Category as mongoose.Model<ICategory>
  || mongoose.model<ICategory>('Category', CategorySchema)
