import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Clerk login skipped for now — middleware passes through. Re-enable when adding auth.
export default function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|ico|png|svg|jpg|jpeg|gif|webp)$).*)"],
};
