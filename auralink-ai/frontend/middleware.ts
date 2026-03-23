import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/app(.*)",
  "/api/stripe/checkout",
]);

// In local dev we want the app to be navigable even when Clerk keys are present
// (e.g. test keys). Clerk middleware can otherwise short-circuit routes.
const clerkEnabled =
  process.env.NODE_ENV === "production" &&
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
  Boolean(process.env.CLERK_SECRET_KEY);

export default clerkEnabled
  ? clerkMiddleware(async (auth, req) => {
      // Keep upgrade page public so users can always see plan options from landing links.
      if (req.nextUrl.pathname.startsWith("/dashboard/upgrade")) return;
      // Static listings hub (rewritten to dashboard-home.html); not the Clerk React /dashboard root.
      if (req.nextUrl.pathname === "/dashboard/home") return;
      // For non-protected routes we must explicitly continue, otherwise Next
      // can treat the middleware as returning no response (leading to 404s).
      if (!isProtectedRoute(req)) return NextResponse.next();
      await auth.protect();
    })
  : function middleware(req: NextRequest) {
      // Dev fallback when Clerk keys aren't set:
      // allow /dashboard and other routes to load without auth.
      return NextResponse.next();
    };

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|ico|png|svg|jpg|jpeg|gif|webp)$).*)"],
};
