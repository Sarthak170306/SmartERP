import { getAuth } from '@clerk/express';
import User from '../models/User.js';

/**
 * Clerk Authentication Gatekeeper with Local Context Resolution
 * 
 * Multi-Tenancy Architecture:
 * - Session Resolution: Verifies session claims and extracts auth context.
 * - Profile Resolution: Looks up the local MongoDB user profile and attaches
 *   `req.user` with their database `id`, email, and company settings.
 * - Circular Dependency Fallback: If no database profile is found, `req.user`
 *   is set to `null` instead of throwing an error, allowing the sync route to operate.
 */
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.warn(`[Auth Warning] Missing Authorization header on route: ${req.originalUrl}`);
    } else if (!authHeader.startsWith('Bearer ')) {
      console.warn(`[Auth Warning] Malformed Authorization header format: "${authHeader.substring(0, 15)}..."`);
    }

    const auth = getAuth(req);

    if (!auth || !auth.userId) {
      console.warn(`[Auth Warning] Unauthenticated access attempt on route: ${req.originalUrl}`);
      return res.status(401).json({
        error: 'Unauthorized: Missing, invalid, or expired session token.',
        code: 'AUTH_UNAUTHORIZED',
      });
    }

    // Attach clerkUserId for sync routing
    req.clerkUserId = auth.userId;

    // Resolve local database User context
    const dbUser = await User.findOne({ clerkUserId: auth.userId });
    if (dbUser) {
      req.user = {
        id: dbUser._id,
        email: dbUser.email,
        activeCompanyId: dbUser.activeCompanyId,
      };
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    console.error(`[Auth Error] Critical error in requireAuth middleware:`, error);
    return res.status(500).json({
      error: 'Internal Server Error during authentication check.',
      code: 'AUTH_INTERNAL_ERROR',
      details: error.message,
    });
  }
};
