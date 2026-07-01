import mongoose from 'mongoose';

/**
 * Invoice Schema (Sales Invoices)
 * 
 * Multi-Tenancy Architecture:
 * - Isolation: Tied to a specific company via `companyId`.
 * - Integrity: Compound unique index on `{ companyId, invoiceNumber }` to prevent duplicate sequence numbers.
 * - Items: Array of nested billing rows referencing stock items.
 */
const invoiceSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required for tenant isolation'],
      index: true
    },
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required']
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    items: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Item',
          required: [true, 'Item ID reference is required']
        },
        qty: {
          type: Number,
          required: [true, 'Quantity is required'],
          default: 1
        },
        rate: {
          type: Number,
          required: [true, 'Rate is required'],
          default: 0
        },
        amount: {
          type: Number,
          required: [true, 'Amount is required'],
          default: 0
        }
      }
    ],
    grossTotal: {
      type: Number,
      required: [true, 'Gross total is required'],
      default: 0
    },
    taxAmount: {
      type: Number,
      default: 0
    },
    netPayable: {
      type: Number,
      required: [true, 'Net payable is required'],
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index on companyId and invoiceNumber
invoiceSchema.index({ companyId: 1, invoiceNumber: 1 }, { unique: true });

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;
