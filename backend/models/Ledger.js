import mongoose from 'mongoose';

/**
 * Ledger Schema (Individual Accounts)
 * 
 * Multi-Tenancy Architecture:
 * - Isolation: Tied to a specific company via `companyId` and a parent group via `groupId`.
 * - Integrity: Uses a compound unique index on `{ companyId, ledgerName }` so that ledgers
 *   are unique within a single company.
 * - Balance Management: Tracks opening balance and dynamic current balance.
 */
const ledgerSchema = new mongoose.Schema(
  {
    ledgerName: {
      type: String,
      required: [true, 'Ledger name is required'],
      trim: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: [true, 'Group ID reference is required'],
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required for tenant isolation'],
      index: true, // Partition index to query all ledgers belonging to a specific company
    },
    openingBalance: {
      type: Number,
      required: [true, 'Opening balance is required'],
      default: 0,
    },
    currentBalance: {
      type: Number,
      required: [true, 'Current balance is required'],
      default: 0, // In production, this is updated as journal/voucher entries are posted
    },
  },
  {
    timestamps: true,
  }
);

// Compound index: enforces ledgerName uniqueness per tenant (companyId)
ledgerSchema.index({ companyId: 1, ledgerName: 1 }, { unique: true });

const Ledger = mongoose.model('Ledger', ledgerSchema);
export default Ledger;
