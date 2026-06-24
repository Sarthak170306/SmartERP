import mongoose from 'mongoose';

const stockItemSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: [true, 'Stock Item name is required'],
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
      default: '',
    },
    gstPercentage: {
      type: Number,
      required: [true, 'GST percentage is required'],
      default: 18,
    },
    purchasePrice: {
      type: Number,
      default: 0,
    },
    openingQty: {
      type: Number,
      default: 0,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required for tenant isolation'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index on itemName per company
stockItemSchema.index({ companyId: 1, itemName: 1 }, { unique: true });

const StockItem = mongoose.model('StockItem', stockItemSchema);
export default StockItem;
