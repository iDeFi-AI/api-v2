import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Backend API endpoint for user validation
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
];

export async function middleware(request: NextRequest) {
  const authTokenCookie = request.cookies.get('auth_token'); // Retrieve auth_token from cookies
  const authToken = authTokenCookie?.value;

  console.log('Middleware authToken:', authToken); // Debugging log

  if (protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route))) {
    if (!authToken) {
      console.error('No token provided. Redirecting to /not-authorized.');
      return NextResponse.redirect(new URL('/not-authorized', request.url));
    }

    try {
      // Validate the user by sending the token to the backend API
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

      // Attach validated user info to the request if needed
      request.headers.set('X-User-UID', validatedUser.uid);
      request.headers.set('X-User-Email', validatedUser.email);

      // Allow access if the user is valid
      return NextResponse.next();
    } catch (error) {
      console.error('User validation failed:', error);
      return NextResponse.redirect(new URL('/not-authorized', request.url));
    }
  }

  // Allow requests to non-protected routes
  return NextResponse.next();
}

// Apply middleware to protected routes
export const config = {
  matcher: protectedRoutes.map((route) => `${route}/:path*`),
};
