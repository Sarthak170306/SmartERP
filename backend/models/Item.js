import mongoose from 'mongoose';

/**
 * Item Schema (Inventory stock items)
 * 
 * Multi-Tenancy Architecture:
 * - Isolation: Tied to a specific company via `companyId`.
 * - Integrity: Uses a compound unique index on `{ companyId, sku }` so that SKUs
 *   are unique within a single company.
 * - Balance Management: Tracks opening and dynamic current quantity, along with pricing and reorder metrics.
 */
const itemSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required for tenant isolation'],
      index: true
    },
    itemName: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      trim: true
    },
    unit: {
      type: String,
      enum: ['PCS', 'BOX', 'KGS', 'LTRS'],
      default: 'PCS'
    },
    openingQty: {
      type: Number,
      default: 0
    },
    currentQty: {
      type: Number,
      default: 0
    },
    purchasePrice: {
      type: Number,
      default: 0
    },
    sellingPrice: {
      type: Number,
      default: 0
    },
    reorderLevel: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Unique compound index scoped per company context
itemSchema.index({ companyId: 1, sku: 1 }, { unique: true });

const Item = mongoose.model('Item', itemSchema);
export default Item;
