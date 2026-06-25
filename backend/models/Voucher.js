import mongoose from 'mongoose';

const voucherSchema = new mongoose.Schema({
  voucherType: {
    type: String,
    enum: ['CONTRA', 'PAYMENT', 'RECEIPT'],
    required: true
  },
  debitLedgerId: {
    type: String,
    required: true
  },
  creditLedgerId: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  narration: {
    type: String
  },
  companyId: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

const Voucher = mongoose.model('Voucher', voucherSchema);
export default Voucher;
