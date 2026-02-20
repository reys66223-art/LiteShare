// This file makes Clerk work during build with dummy values
// Replace these with your actual Clerk keys from https://dashboard.clerk.com

// Test keys format (these won't actually authenticate but pass validation)
const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_dGVzdC10ZW5hbnQtMTIzNDU2Nzg5MA';
const secretKey = process.env.CLERK_SECRET_KEY || 'sk_test_dGVzdC1zZWNyZXQta2V5LTEyMzQ1Njc4OTA';

export { publishableKey, secretKey };
