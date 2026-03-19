import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/app(.*)",
  "/api/stripe/checkout",
]);

const clerkEnabled =
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
  Boolean(process.env.CLERK_SECRET_KEY);

/** Production home: serve public/landing.html at `/` (URL bar stays `/`). */
function rewriteRootToLanding(req: NextRequest): NextResponse | null {
  if (req.nextUrl.pathname === "/") {
    return NextResponse.rewrite(new URL("/landing.html", req.url));
  }
  return null;
}

export default clerkEnabled
  ? clerkMiddleware(async (auth, req) => {
      const landing = rewriteRootToLanding(req);
      if (landing) return landing;
      // Keep upgrade page public so users can always see plan options from landing links.
      if (req.nextUrl.pathname.startsWith("/dashboard/upgrade")) return;
      if (!isProtectedRoute(req)) return;
      await auth.protect();
    })
  : function middleware(req: NextRequest) {
      const landing = rewriteRootToLanding(req);
      if (landing) return landing;
      // Dev fallback when Clerk keys aren't set:
      // allow /dashboard and other routes to load without auth.
      return NextResponse.next();
    };

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|ico|png|svg|jpg|jpeg|gif|webp)$).*)"],
};
