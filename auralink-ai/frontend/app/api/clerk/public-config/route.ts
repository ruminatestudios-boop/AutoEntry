import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const publishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() || "";

  return NextResponse.json({
    publishableKey,
  });
}

