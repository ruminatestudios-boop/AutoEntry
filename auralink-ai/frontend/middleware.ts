import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * NOTE: Vercel Edge Middleware cannot import Node-only modules.
 * Clerk's middleware can currently pull in Node crypto in some build paths,
 * causing production builds to fail. We rely on client-side gating
 * (SignedIn/SignedOut) for now to keep deployments healthy.
 */
export default function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|ico|png|svg|jpg|jpeg|gif|webp)$).*)"],
};
