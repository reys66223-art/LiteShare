import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

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
  
  // Set guest ID cookie if not exists
  const response = NextResponse.next();
  const guestIdCookie = req.cookies.get('guestId');
  
  if (!guestIdCookie) {
    // Generate a unique guest ID
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Set cookie for 30 days
    response.cookies.set('guestId', guestId, {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  }
  
  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
