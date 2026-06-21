import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes (accessible without being signed in)
const isPublicRoute = createRouteMatcher([
  '/', // Landing Page is public
  '/sign-in(.*)', 
  '/sign-up(.*)'
]);

export default clerkMiddleware(async (auth, request) => {
  // Enforce session check on all routes except the public ones (like /dashboard)
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.[\\w]+$).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
