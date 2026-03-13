import mongoose, { type Document, Schema } from 'mongoose'

export interface IIngredient {
  name: string
  quantity: number
  unit: string
  comments: string
}

export interface ISubRecipe {
  recipeName: string
  quantity: number
}

export interface IRecipe extends Document {
  recipeName: string
  unit: string
  ingredients: IIngredient[]
  subRecipes: ISubRecipe[]
  methodOfPreparation: string
  chefNotes: string
  chefLink: string
  coolingProcedures: string
  additionalNotes: string
  createdAt: Date
  updatedAt: Date
}

const IngredientSchema = new Schema<IIngredient>(
  {
    name: { type: String, trim: true, default: '' },
    quantity: { type: Number, default: 0 },
    unit: { type: String, trim: true, default: '' },
    comments: { type: String, trim: true, default: '' },
  },
  { _id: false },
)

const SubRecipeSchema = new Schema<ISubRecipe>(
  {
    recipeName: { type: String, trim: true, default: '' },
    quantity: { type: Number, default: 1 },
  },
  { _id: false },
)

const RecipeSchema = new Schema<IRecipe>(
  {
    recipeName: { type: String, required: true, trim: true },
    unit: { type: String, trim: true, default: '' },
    ingredients: { type: [IngredientSchema], default: [] },
    subRecipes: { type: [SubRecipeSchema], default: [] },
    methodOfPreparation: { type: String, trim: true, default: '' },
    chefNotes: { type: String, trim: true, default: '' },
    chefLink: { type: String, trim: true, default: '' },
    coolingProcedures: { type: String, trim: true, default: '' },
    additionalNotes: { type: String, trim: true, default: '' },
  },
  {
    timestamps: true,
    collection: 'CG_Recipes',
  },
)

export const Recipe = mongoose.models.Recipe as mongoose.Model<IRecipe>
  || mongoose.model<IRecipe>('Recipe', RecipeSchema)
