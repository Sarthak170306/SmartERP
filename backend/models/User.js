import mongoose from 'mongoose';

/**
 * User Schema
 * 
 * Multi-Tenancy Architecture:
 * - Root Identity: Ties authentication (via clerkUserId) to SmartERP's internal models.
 * - Contextual Tenant: Stores `activeCompanyId` to resolve the current active company
 *   tenant context on the backend. Every operational request should verify if the user
 *   has access to the activeCompanyId.
 */
const userSchema = new mongoose.Schema(
  {
    clerkUserId: {
      type: String,
      required: [true, 'Clerk User ID is required'],
      unique: true,
      index: true, // Optimized for fast lookups during request authentication/authorization
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    activeCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null, // Initialized to null until a company is created/selected
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);
export default User;
