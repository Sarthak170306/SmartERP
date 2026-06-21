import { getAuth } from '@clerk/express';

/**
 * Clerk Authentication Gatekeeper
 * 
 * Multi-Tenancy Architecture:
 * - Session Resolution: Intercepts the request and extracts authentication state.
 * - Context Injection: Attaches the verified `clerkUserId` to the `req` object.
 */
export const requireAuth = (req, res, next) => {
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

    // Attach clerkUserId for subsequent handlers
    req.clerkUserId = auth.userId;
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
