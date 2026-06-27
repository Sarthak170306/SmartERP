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
    const creditLedger = await Ledger.findOne({ _id: creditLedgerId, companyId }).populate('groupId');
    if (!creditLedger) {
      return res.status(404).json({ error: `Credit ledger with ID ${creditLedgerId} not found in this company.` });
    }

    // Find the Debit Ledger and add the amount to its currentBalance
    const debitLedger = await Ledger.findOne({ _id: debitLedgerId, companyId }).populate('groupId');
    if (!debitLedger) {
      return res.status(404).json({ error: `Debit ledger with ID ${debitLedgerId} not found in this company.` });
    }

    // 1. Contra Group Check Validation
    if (voucherType === 'CONTRA') {
      const isCreditCashOrBank = 
        creditLedger.ledgerName.toLowerCase().includes('cash') || 
        creditLedger.ledgerName.toLowerCase().includes('bank') ||
        (creditLedger.groupId && (
          creditLedger.groupId.groupName.toLowerCase().includes('cash') || 
          creditLedger.groupId.groupName.toLowerCase().includes('bank')
        ));
      
      const isDebitCashOrBank = 
        debitLedger.ledgerName.toLowerCase().includes('cash') || 
        debitLedger.ledgerName.toLowerCase().includes('bank') ||
        (debitLedger.groupId && (
          debitLedger.groupId.groupName.toLowerCase().includes('cash') || 
          debitLedger.groupId.groupName.toLowerCase().includes('bank')
        ));

      if (!isCreditCashOrBank || !isDebitCashOrBank) {
        return res.status(400).json({ error: "Contra voucher only allows Cash-to-Bank or Bank-to-Cash entries!" });
      }
    }

    // 2. Strict Negative Balance Validation Safeguard
    if (creditLedger.currentBalance - numAmount < 0) {
      return res.status(400).json({ error: "Insufficient Balance! Cannot pass transaction with negative cash/bank balance." });
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
