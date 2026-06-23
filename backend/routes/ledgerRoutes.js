import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import Ledger from '../models/Ledger.js';
import Group from '../models/Group.js';

const router = express.Router();

const PREDEFINED_GROUPS = [
  { groupName: 'Assets', type: 'Asset' },
  { groupName: 'Liabilities', type: 'Liability' },
  { groupName: 'Income', type: 'Income' },
  { groupName: 'Expenses', type: 'Expense' }
];

/**
 * GET /api/ledgers/groups
 * 
 * Lists all accounting groups for the active company.
 * If no groups exist, auto-seeds the predefined base groups.
 */
router.get('/groups', requireAuth, async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || req.query.companyId || (req.user && req.user.activeCompanyId);

    if (!companyId) {
      return res.status(400).json({
        error: 'Active Company ID is required for tenant isolation.',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    // Fetch existing groups
    let groups = await Group.find({ companyId }).sort({ groupName: 1 });

    // Seed base groups if none exist
    if (groups.length === 0) {
      console.log(`[Ledger Groups] No groups found for company ID: ${companyId}. Seeding predefined groups...`);
      const seedData = PREDEFINED_GROUPS.map(g => ({
        groupName: g.groupName,
        type: g.type,
        companyId: companyId
      }));
      
      groups = await Group.insertMany(seedData);
      // Sort after inserting
      groups.sort((a, b) => a.groupName.localeCompare(b.groupName));
    }

    return res.status(200).json({
      success: true,
      groups
    });
  } catch (error) {
    console.error('Ledger Groups Retrieval Failure:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
});

/**
 * POST /api/ledgers/create
 * 
 * Creates a new ledger under the specified parent group and company context.
 * Enforces unique ledger name constraint per company and validates parent group.
 */
router.post('/create', requireAuth, async (req, res) => {
  try {
    const { ledgerName, groupId, companyId, openingBalance } = req.body;
    const headerCompanyId = req.headers['x-company-id'];

    // 1. Mandatory field checks
    if (!ledgerName || !ledgerName.trim()) {
      return res.status(400).json({
        error: 'Ledger name is required.',
        code: 'LEDGER_NAME_REQUIRED'
      });
    }

    if (!groupId) {
      return res.status(400).json({
        error: 'Parent Group ID is required.',
        code: 'LEDGER_GROUP_REQUIRED'
      });
    }

    if (!companyId) {
      return res.status(400).json({
        error: 'Company ID is required.',
        code: 'LEDGER_COMPANY_REQUIRED'
      });
    }

    // 2. Tenant isolation validation
    if (headerCompanyId && headerCompanyId !== companyId) {
      return res.status(403).json({
        error: 'Access denied: Company context mismatch.',
        code: 'TENANT_MISMATCH'
      });
    }

    // 3. Parent Group validation
    const parentGroup = await Group.findOne({ _id: groupId, companyId });
    if (!parentGroup) {
      return res.status(400).json({
        error: 'The selected accounting group is invalid or does not belong to this company.',
        code: 'INVALID_GROUP'
      });
    }

    // 4. Duplicate name validation
    const duplicateLedger = await Ledger.findOne({ 
      companyId, 
      ledgerName: { $regex: new RegExp(`^${ledgerName.trim()}$`, 'i') } 
    });

    if (duplicateLedger) {
      return res.status(400).json({
        error: `Ledger "${ledgerName.trim()}" already exists for this company.`,
        code: 'LEDGER_DUPLICATE_NAME'
      });
    }

    // 5. Balance parsing
    const parsedOpeningBalance = Number(openingBalance) || 0;

    // 6. Instantiate & save
    const ledger = new Ledger({
      ledgerName: ledgerName.trim(),
      groupId,
      companyId,
      openingBalance: parsedOpeningBalance,
      currentBalance: parsedOpeningBalance // defaults to openingBalance
    });

    await ledger.save();
    console.log(`[Ledger Create] Saved ledger "${ledgerName.trim()}" under group "${parentGroup.groupName}" for company ID: ${companyId}`);

    // Populate group details for client response convenience
    await ledger.populate('groupId');

    return res.status(201).json({
      success: true,
      message: 'Ledger created successfully.',
      ledger
    });
  } catch (error) {
    console.error('Ledger Creation Failure:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
});

/**
 * GET /api/ledgers
 * 
 * Fetches all ledgers for the active company. Supports searching by name.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || req.query.companyId || (req.user && req.user.activeCompanyId);
    const { search } = req.query;

    if (!companyId) {
      return res.status(400).json({
        error: 'Active Company ID is required for tenant isolation.',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    const query = { companyId };

    if (search && search.trim() !== '') {
      query.ledgerName = { $regex: search.trim(), $options: 'i' };
    }

    // Fetch and populate parent group
    const ledgers = await Ledger.find(query)
      .populate('groupId')
      .sort({ ledgerName: 1 });

    return res.status(200).json({
      success: true,
      ledgers
    });
  } catch (error) {
    console.error('Ledger List Retrieval Failure:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
});

export default router;
