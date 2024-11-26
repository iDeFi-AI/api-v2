import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BACKEND_API_VALIDATE_USER_URL = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/validate_user`;

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
  '/mini-app',
  '/mini-appv2'
];

// In-memory cache for validated tokens
const tokenCache = new Map<string, { uid: string; email: string; expiry: number }>();

// Helper function to validate token locally
const isTokenCached = (token: string) => {
  const cachedEntry = tokenCache.get(token);
  if (!cachedEntry) return false;

  const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
  if (cachedEntry.expiry && cachedEntry.expiry > currentTime) {
    return cachedEntry;
  }

  // Remove expired token
  tokenCache.delete(token);
  return false;
};

export async function middleware(request: NextRequest) {
  const authTokenCookie = request.cookies.get('auth_token');
  const authToken = authTokenCookie?.value;

  if (protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route))) {
    if (!authToken) {
      console.error('No token provided. Redirecting to /not-authorized.');
      return NextResponse.redirect(new URL('/not-authorized', request.url));
    }

    // Check if the token is already validated in the cache
    const cachedUser = isTokenCached(authToken);
    if (cachedUser) {
      console.log('Token validated from cache:', cachedUser);
      // Attach user info to the headers
      request.headers.set('X-User-UID', cachedUser.uid);
      request.headers.set('X-User-Email', cachedUser.email);
      return NextResponse.next();
    }

    // If not cached, validate with the backend
    try {
      const response = await fetch(BACKEND_API_VALIDATE_USER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken: authToken }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`User validation failed: ${response.status} - ${errorText}`);
        throw new Error('User validation failed.');
      }

      const validatedUser = await response.json();
      console.log('Validated User:', validatedUser);

      // Store validated token in the cache
      const expiry = validatedUser.exp || Math.floor(Date.now() / 1000) + 15 * 60; // Default 15 mins
      tokenCache.set(authToken, { uid: validatedUser.uid, email: validatedUser.email, expiry });

      // Attach user info to the headers
      request.headers.set('X-User-UID', validatedUser.uid);
      request.headers.set('X-User-Email', validatedUser.email);

      return NextResponse.next();
    } catch (error) {
      console.error('User validation failed:', error);
      return NextResponse.redirect(new URL('/not-authorized', request.url));
    }
  }

  return NextResponse.next();
}

// Apply middleware to protected routes
export const config = {
  matcher: protectedRoutes.map((route) => `${route}/:path*`),
};
