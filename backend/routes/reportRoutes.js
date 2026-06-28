import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import Ledger from '../models/Ledger.js';

const router = express.Router();

/**
 * GET /api/reports/trial-balance
 * 
 * Aggregates all ledgers for a company into Assets/Expenses (Debit) 
 * and Liabilities/Equity/Income (Credit) sections.
 */
router.get('/trial-balance', requireAuth, async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || req.query.companyId || (req.user && req.user.activeCompanyId);

    if (!companyId) {
      return res.status(400).json({ 
        error: 'Active Company ID is required in headers (x-company-id).',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    // Fetch all ledgers for the company and populate parent groups
    const ledgers = await Ledger.find({ companyId }).populate('groupId');

    const assets = [];
    const liabilities = [];
    let totalDebit = 0;
    let totalCredit = 0;

    for (const ledger of ledgers) {
      const balance = Number(ledger.currentBalance) || 0;
      
      const ledgerNameLower = ledger.ledgerName.toLowerCase();
      const groupName = ledger.groupId ? ledger.groupId.groupName : '';
      const groupNameLower = groupName.toLowerCase();
      const groupType = ledger.groupId ? ledger.groupId.type : '';
      const groupTypeLower = groupType.toLowerCase();

      // Credit categorization rules
      const belongsToCredit = 
        groupNameLower === 'capital' || 
        groupNameLower === 'equity' || 
        groupNameLower === 'liabilities' || 
        groupNameLower === 'liability' || 
        groupNameLower === 'income' || 
        ledgerNameLower.includes('capital') ||
        groupTypeLower === 'liability' ||
        groupTypeLower === 'income';

      // Debit categorization rules
      const belongsToDebit = 
        groupNameLower === 'assets' || 
        groupNameLower === 'current assets' || 
        groupNameLower === 'expenses' || 
        ledgerNameLower === 'cash' ||
        groupTypeLower === 'asset' ||
        groupTypeLower === 'expense';

      let isDebitAccount = true;
      if (belongsToCredit) {
        isDebitAccount = false;
      } else if (belongsToDebit) {
        isDebitAccount = true;
      } else {
        isDebitAccount = !(groupTypeLower === 'liability' || groupTypeLower === 'income');
      }

      // Special rule: Ensure capital is treated as a positive Credit balance
      let finalBalance = balance;
      if (ledgerNameLower.includes('capital')) {
        finalBalance = Math.abs(balance);
      }

      if (isDebitAccount) {
        assets.push({
          _id: ledger._id,
          ledgerName: ledger.ledgerName,
          currentBalance: finalBalance,
          groupName: ledger.groupId ? ledger.groupId.groupName : 'Uncategorized'
        });
        totalDebit += finalBalance;
      } else {
        liabilities.push({
          _id: ledger._id,
          ledgerName: ledger.ledgerName,
          currentBalance: finalBalance,
          groupName: ledger.groupId ? ledger.groupId.groupName : 'Uncategorized'
        });
        totalCredit += finalBalance;
      }
    }

    return res.status(200).json({
      assets,
      liabilities,
      totalDebit,
      totalCredit
    });
  } catch (error) {
    console.error('Trial Balance Generation Failure:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
});

export default router;
