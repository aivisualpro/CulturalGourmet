import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String }, // hashed password, optional for Google-only users
  role: { type: String, enum: ['user', 'super_admin'], default: 'user' },
  provider: { type: String, enum: ['email', 'google'], default: 'email' },
  googleId: { type: String, sparse: true },
  avatar: { type: String, default: '' },

  // Email verification
  emailVerified: { type: Boolean, default: false },
  emailVerificationCode: { type: String },
  emailVerificationExpiry: { type: Date },

  // Approval workflow
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  approvedBy: { type: String }, // email of admin who approved
  approvedAt: { type: Date },
  rejectedReason: { type: String },

  // Password reset
  resetPasswordCode: { type: String },
  resetPasswordExpiry: { type: Date },

  lastLoginAt: { type: Date },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
})

// Index for fast lookups
UserSchema.index({ email: 1 })
UserSchema.index({ approvalStatus: 1 })
UserSchema.index({ role: 1 })

export const User = mongoose.models.User || mongoose.model('User', UserSchema)
