import mongoose from 'mongoose';

/**
 * Group Schema (Account Categories)
 * 
 * Multi-Tenancy Architecture:
 * - Isolation: Tied to a specific company via `companyId`.
 * - Integrity: Uses a compound unique index on `{ companyId, groupName }` to ensure
 *   that group names are unique within a single company, while allowing different companies
 *   to have groups with identical names without collision.
 */
const groupSchema = new mongoose.Schema(
  {
    groupName: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Group type is required'],
      enum: {
        values: ['Asset', 'Liability', 'Income', 'Expense'],
        message: '{VALUE} is not a valid group type (must be Asset, Liability, Income, or Expense)',
      },
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required for tenant isolation'],
      index: true, // Partition index to query all groups belonging to a specific company
    },
  },
  {
    timestamps: true,
  }
);

// Compound index: enforces groupName uniqueness per tenant (companyId)
groupSchema.index({ companyId: 1, groupName: 1 }, { unique: true });

const Group = mongoose.model('Group', groupSchema);
export default Group;
