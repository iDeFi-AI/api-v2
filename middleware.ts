// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define all protected routes
const protectedRoutes = [
  '/origins',
  '/metrics',
  '/monitor',
  '/firewall',
  '/smartscan',
  '/undust',
  '/txmap',
  '/visualize',
  '/devs',
  '/docs',
];

export function middleware(request: NextRequest) {
  const authToken = request.cookies.get('auth_token'); // Check authentication token in cookies

  // If route matches protected routes and user is not authenticated, redirect to "not authorized"
  if (protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route))) {
    if (!authToken) {
      return NextResponse.redirect(new URL('/not-authorized', request.url));
    }
  }

  return NextResponse.next();
}

// Apply middleware to protected routes
export const config = {
  matcher: protectedRoutes.map((route) => `${route}/:path*`), // Apply middleware with wildcard matching
};
