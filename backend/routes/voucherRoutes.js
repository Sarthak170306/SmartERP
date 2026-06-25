import express from 'express';
import Voucher from '../models/Voucher.js';
import Ledger from '../models/Ledger.js';

const router = express.Router();

/**
 * POST /api/vouchers/create
 * Creates a voucher entry and performs double-entry balance adjustment
 * on the debit and credit ledgers.
 */
router.post('/create', async (req, res) => {
  try {
    const { voucherType, debitLedgerId, creditLedgerId, amount, narration } = req.body;
    const companyId = req.headers['x-company-id'];

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required in x-company-id header.' });
    }

    if (!voucherType || !debitLedgerId || !creditLedgerId || amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields: voucherType, debitLedgerId, creditLedgerId, amount are required.' });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number.' });
    }

    // Find the Credit Ledger and subtract the amount from its currentBalance
    const creditLedger = await Ledger.findOne({ _id: creditLedgerId, companyId });
    if (!creditLedger) {
      return res.status(404).json({ error: `Credit ledger with ID ${creditLedgerId} not found in this company.` });
    }

    // Find the Debit Ledger and add the amount to its currentBalance
    const debitLedger = await Ledger.findOne({ _id: debitLedgerId, companyId });
    if (!debitLedger) {
      return res.status(404).json({ error: `Debit ledger with ID ${debitLedgerId} not found in this company.` });
    }

    // Apply double-entry balance adjustment
    creditLedger.currentBalance -= numAmount;
    await creditLedger.save();

    debitLedger.currentBalance += numAmount;
    await debitLedger.save();

    // Create and save the new Voucher object inside MongoDB
    const voucher = new Voucher({
      voucherType,
      debitLedgerId,
      creditLedgerId,
      amount: numAmount,
      narration,
      companyId
    });
    await voucher.save();

    return res.status(201).json({
      success: true,
      voucher
    });
  } catch (error) {
    console.error('Voucher creation error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
