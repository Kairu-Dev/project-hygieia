import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { routeAccess } from "./lib/routes";

const matchers = Object.keys(routeAccess).map((route) => ({
  matcher: createRouteMatcher([route]),
  allowedRoles: routeAccess[route],
}));

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();
  const url = new URL(req.url);

  const role =
    userId && sessionClaims?.metadata?.role
      ? sessionClaims.metadata.role
      : userId
        ? "patient"
        : "sign-in";

  const matchingRoute = matchers.find(({ matcher }) => matcher(req));

  if (matchingRoute && !matchingRoute.allowedRoles.includes(role)) {
    // Redirect unauthorized roles to their respective default pages
    return NextResponse.redirect(new URL(`/${role}`, url.origin));
  }

  // Continue if the user is authorized
  const response = NextResponse.next();

  // Generate CSP Nonce
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // Create CSP Header
  // Note: Adjust allowed domains as needed (clerk, sentry, etc.)
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' https: http:;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self' data:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    connect-src 'self' https://*.sentry.io https://*.clerk.accounts.dev https://clerk.com https://*.clerk.com;
    frame-src 'self' https://*.clerk.accounts.dev https://clerk.com https://*.clerk.com;
    worker-src 'self' blob:;
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  // Set CSP Header
  response.headers.set("Content-Security-Policy", cspHeader);
  // Also pass the nonce to the client via a custom header so Server Components can read it
  response.headers.set("x-nonce", nonce);

  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
