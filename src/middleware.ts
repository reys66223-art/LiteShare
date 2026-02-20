import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// All routes are public - authentication is optional
// Dashboard and user-specific features will handle auth internally
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/f/:fileId',
  '/browse',
  '/api/uploadthing',
  '/api/files(.*)',
  '/api/dashboard(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // All routes are accessible without authentication
  // Individual pages/components will handle auth state as needed
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
