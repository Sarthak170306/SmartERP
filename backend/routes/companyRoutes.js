import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import Company from '../models/Company.js';
import User from '../models/User.js';

const router = express.Router();

/**
 * POST /api/companies/create
 * 
 * Creates a new company profile under the authenticated user.
 * Enforces the SaaS subscription limit of 5 companies maximum.
 */
router.post('/create', requireAuth, async (req, res) => {
  try {
    const { companyName, address, gstNumber, financialYear, state, contactInfo } = req.body;

    // 1. Validate mandatory fields
    if (!companyName || !companyName.trim()) {
      return res.status(400).json({
        error: 'Company name is required.',
        code: 'COMPANY_NAME_REQUIRED',
      });
    }

    if (!financialYear || !financialYear.trim()) {
      return res.status(400).json({
        error: 'Financial year is required.',
        code: 'COMPANY_FY_REQUIRED',
      });
    }

    if (!state || !state.trim()) {
      return res.status(400).json({
        error: 'State is required for compliance/GST classification.',
        code: 'COMPANY_STATE_REQUIRED',
      });
    }

    // 2. Ensure auth middleware populated the user context
    if (!req.user || !req.user.id) {
      return res.status(404).json({
        error: 'User profile not synchronized. Please sync user context first.',
        code: 'USER_NOT_SYNCED',
      });
    }

    // 3. Enforce SaaS Limit: count existing companies owned by this user
    const existingCount = await Company.countDocuments({ userId: req.user.id });
    if (existingCount >= 5) {
      return res.status(400).json({
        error: 'SaaS Limit Reached: You can manage a maximum of 5 companies per account.',
        code: 'SAAS_LIMIT_REACHED',
      });
    }

    // 4. Handle optional fields: map empty strings to undefined to prevent unique key / index issues in DB
    const cleanedGstNumber = gstNumber && gstNumber.trim() !== '' ? gstNumber.trim() : undefined;
    const cleanedAddress = address && address.trim() !== '' ? address.trim() : undefined;
    const cleanedPhone = contactInfo?.phone && contactInfo.phone.trim() !== '' ? contactInfo.phone.trim() : undefined;
    const cleanedEmail = contactInfo?.email && contactInfo.email.trim() !== '' ? contactInfo.email.trim() : undefined;

    // 5. Create and save the company document
    const company = new Company({
      companyName: companyName.trim(),
      address: cleanedAddress,
      gstNumber: cleanedGstNumber,
      financialYear: financialYear.trim(),
      state: state.trim(),
      contactInfo: {
        phone: cleanedPhone,
        email: cleanedEmail,
      },
      userId: req.user.id,
    });

    await company.save();
    console.log(`[Company Create] Initialized company "${companyName}" for user ID: ${req.user.id}`);

    // UX Shortcut: Automatically set activeCompanyId on user profile if they don't have one
    const dbUser = req.user.dbUser || await User.findById(req.user.id);
    let activeCompanyId = req.user.activeCompanyId;

    if (dbUser && !dbUser.activeCompanyId) {
      dbUser.activeCompanyId = company._id;
      await dbUser.save();
      activeCompanyId = company._id;
      console.log(`[Company Create] Set "${companyName}" as active company context for user ID: ${req.user.id}`);
    }

    return res.status(201).json({
      success: true,
      message: 'Company created successfully.',
      company,
      activeCompanyId,
    });
  } catch (error) {
    // Log the exact error to console for debugging as requested
    console.error("Company Creation Failure:", error);

    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

/**
 * GET /api/companies
 * 
 * Fetches all companies owned by the authenticated user.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    // Ensure auth middleware populated the user context
    if (!req.user || !req.user.id) {
      return res.status(404).json({
        error: 'User profile not synchronized.',
        code: 'USER_NOT_SYNCED',
      });
    }

    // Retrieve all companies belonging to this user
    const companies = await Company.find({ userId: req.user.id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      companies,
    });
  } catch (error) {
    console.error('[Company List Error] Failed to retrieve companies:', error);
    return res.status(500).json({
      error: 'Failed to retrieve companies.',
      code: 'COMPANY_LIST_FAILED',
      details: error.message,
    });
  }
});

export default router;
