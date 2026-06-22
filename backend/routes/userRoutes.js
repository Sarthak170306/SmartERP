import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { clerkClient } from '@clerk/express';
import User from '../models/User.js';
import Company from '../models/Company.js';

const router = express.Router();

/**
 * Shared synchronization handler for GET & POST requests.
 * 
 * Implements a bulletproof multi-stage session resolution:
 * 1. Checks if a user already exists with either matching clerkUserId OR email address.
 * 2. If found, synchronizes properties (email/clerkUserId) and returns the profile context.
 * 3. If not found, attempts creation. If a unique key index collision (E11000) occurs during
 *    parallel execution, falls back to retrieving the existing record by email and syncing it.
 */
const syncUserHandler = async (req, res) => {
  try {
    const clerkUserId = req.clerkUserId;
    console.log(`[User Sync] Resolving sync for Clerk User ID: ${clerkUserId}`);

    // Fetch user profile from Clerk API to ensure data accuracy
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    
    if (!clerkUser) {
      console.warn(`[User Sync Warning] User not found on Clerk backend for ID: ${clerkUserId}`);
      return res.status(404).json({
        error: 'Clerk user profile not found.',
        code: 'USER_CLERK_PROFILE_NOT_FOUND',
      });
    }

    // Resolve user's primary email address
    const email = clerkUser.emailAddresses.find(
      (emailObj) => emailObj.id === clerkUser.primaryEmailAddressId
    )?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
      console.warn(`[User Sync Warning] User profile ${clerkUserId} lacks a valid email address.`);
      return res.status(400).json({
        error: 'User account has no valid email address.',
        code: 'USER_SYNC_NO_EMAIL',
      });
    }

    // 1. Perform an explicit lookup first: match by clerkUserId OR email
    const existingUser = await User.findOne({ 
      $or: [ { clerkUserId: clerkUserId }, { email: email } ] 
    });

    // 2. If the user exists, ensure keys are synchronized and return 200 OK
    if (existingUser) {
      let isModified = false;
      if (existingUser.clerkUserId !== clerkUserId) {
        existingUser.clerkUserId = clerkUserId;
        isModified = true;
      }
      if (existingUser.email !== email) {
        existingUser.email = email;
        isModified = true;
      }
      if (isModified) {
        await existingUser.save();
        console.log(`[User Sync] Database user profile updated & synced: ${email}`);
      } else {
        console.log(`[User Sync] Database user profile already in sync: ${email}`);
      }

      return res.status(200).json({
        success: true,
        message: 'User session synchronized successfully.',
        user: {
          id: existingUser._id,
          clerkUserId: existingUser.clerkUserId,
          email: existingUser.email,
          activeCompanyId: existingUser.activeCompanyId,
        },
      });
    }

    // 3. If the user does NOT exist, create the record inside a robust try/catch
    try {
      console.log(`[User Sync] No existing profile. Initializing local database user: ${email}`);
      const newUser = await User.create({
        clerkUserId,
        email,
        activeCompanyId: null, // Initialized to null on creation
      });

      return res.status(201).json({
        success: true,
        message: 'User session synchronized successfully (profile created).',
        user: {
          id: newUser._id,
          clerkUserId: newUser.clerkUserId,
          email: newUser.email,
          activeCompanyId: newUser.activeCompanyId,
        },
      });
    } catch (createError) {
      // Catch E11000 duplicate key error code
      if (createError.code === 11000) {
        console.warn(`[User Sync Warning] Collision detected during user insertion. Executing secondary lookup fallback...`);
        
        // Find existing record by email as fallback
        const fallbackUser = await User.findOne({ email });
        if (fallbackUser) {
          let fallbackModified = false;
          if (fallbackUser.clerkUserId !== clerkUserId) {
            fallbackUser.clerkUserId = clerkUserId;
            fallbackModified = true;
          }
          if (fallbackModified) {
            await fallbackUser.save();
            console.log(`[User Sync] Local user fallback synchronized clerkUserId: ${email}`);
          }
          
          return res.status(200).json({
            success: true,
            message: 'User session synchronized successfully (fallback resolve).',
            user: {
              id: fallbackUser._id,
              clerkUserId: fallbackUser.clerkUserId,
              email: fallbackUser.email,
              activeCompanyId: fallbackUser.activeCompanyId,
            },
          });
        }
      }
      
      // Re-throw if it's another validation/connection error
      throw createError;
    }
  } catch (error) {
    // Log the exact error for backend debugging
    console.error("Sync Route Crash Error:", error);
    
    return res.status(500).json({
      error: 'Failed to synchronize user session with the database.',
      code: 'USER_SYNC_FAILED',
      details: error.message,
    });
  }
};

// Support both GET and POST sync requests
router.get('/sync', requireAuth, syncUserHandler);
router.post('/sync', requireAuth, syncUserHandler);

/**
 * PUT /api/user/active-company
 * 
 * Switches the active company context for the authenticated user session.
 */
router.put('/active-company', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.body;

    const user = await User.findOne({ clerkUserId: req.clerkUserId });
    if (!user) {
      return res.status(404).json({
        error: 'User profile not found.',
        code: 'USER_NOT_FOUND',
      });
    }

    if (companyId) {
      // Verify that the requested company exists and belongs to the logged-in user
      const company = await Company.findOne({ _id: companyId, userId: user._id });
      if (!company) {
        return res.status(403).json({
          error: 'Unauthorized: You do not own this company.',
          code: 'COMPANY_ACCESS_DENIED',
        });
      }
      
      user.activeCompanyId = companyId;
      console.log(`[Active Company Switch] User ${user.email} switched active context to "${company.companyName}"`);
    } else {
      user.activeCompanyId = null;
      console.log(`[Active Company Switch] User ${user.email} cleared active company context`);
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Active company context updated successfully.',
      activeCompanyId: user.activeCompanyId,
    });
  } catch (error) {
    console.error('[Active Company Switch Error] Failed to update active context:', error);
    return res.status(500).json({
      error: 'Failed to update active company context.',
      code: 'ACTIVE_COMPANY_SWITCH_FAILED',
      details: error.message,
    });
  }
});

export default router;
