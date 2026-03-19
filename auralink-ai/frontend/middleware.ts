import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/app(.*)",
  "/api/stripe/checkout",
]);

const clerkEnabled =
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
  Boolean(process.env.CLERK_SECRET_KEY);

export default clerkEnabled
  ? clerkMiddleware(async (auth, req) => {
      // Keep upgrade page public so users can always see plan options from landing links.
      if (req.nextUrl.pathname.startsWith("/dashboard/upgrade")) return;
      if (!isProtectedRoute(req)) return;
      await auth.protect();
    })
  : function middleware() {
      // Dev fallback when Clerk keys aren't set:
      // allow /dashboard and other routes to load without auth.
      return NextResponse.next();
    };

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|ico|png|svg|jpg|jpeg|gif|webp)$).*)"],
};
