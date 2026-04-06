import { NextRequest, NextResponse } from 'next/server';

/**
 * Global Next.js middleware — runs on every matched request.
 *
 * Responsibilities:
 *  1. Security headers (CSP, HSTS, etc.) on all responses
 *  2. API key authentication for protected API routes
 *  3. Request logging in development
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Routes that require the x-api-key header (when API_SECRET is set). */
const PROTECTED_API_ROUTES = ['/api/executor', '/api/world-chat'];

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- API key authentication for protected routes ---
  const apiSecret = process.env['API_SECRET'];
  if (apiSecret) {
    const isProtected = PROTECTED_API_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route + '/'),
    );
    if (isProtected) {
      const provided = request.headers.get('x-api-key');
      if (!provided || provided !== apiSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
  }

  const response = NextResponse.next();

  // --- Security headers ---
  // Content-Security-Policy — restrictive baseline; adjust as needed for
  // third-party scripts/fonts/images used in production.
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      // Next.js needs inline scripts & styles for hydration
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' wss: ws: https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  );

  // HSTS — tell browsers to always use HTTPS (1 year, include subdomains)
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Prevent MIME-type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Cross-Origin policies
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');

  return response;
}

// ---------------------------------------------------------------------------
// Matcher — run on all routes except static assets & Next.js internals
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
