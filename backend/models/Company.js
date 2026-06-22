import mongoose from 'mongoose';

/**
 * Company Schema (Tenant Profile)
 * 
 * Multi-Tenancy Architecture:
 * - Ownership: Each company belongs to a specific User via `userId`.
 * - SaaS Limits: Enforces a maximum of 5 companies per user using a pre-save hook.
 * - Localized Compliance: Stores crucial data such as `gstNumber` and `state` for tax/compliance calculation,
 *   which are scoped entirely per company.
 */
const companySchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    gstNumber: {
      type: String,
      trim: true,
    },
    financialYear: {
      type: String,
      required: [true, 'Financial year is required (e.g., 2026-2027)'],
      trim: true,
    },
    state: {
      type: String,
      required: [true, 'State is required for compliance/GST classification'],
      trim: true,
    },
    contactInfo: {
      phone: { type: String, trim: true },
      email: { type: String, lowercase: true, trim: true },
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID owner is required'],
      index: true, // Speeds up lookup of user's companies and tenancy checks
    },
  },
  {
    timestamps: true,
  }
);

// Enforce multi-tenant subscription rule: max 5 companies per user
companySchema.pre('save', async function() {
  const company = this;
  if (company.isNew) {
    const count = await mongoose.model('Company').countDocuments({ userId: company.userId });
    if (count >= 5) {
      throw new Error("SaaS Limit Reached: You can manage a maximum of 5 companies per account.");
    }
  }
});

const Company = mongoose.model('Company', companySchema);
export default Company;
