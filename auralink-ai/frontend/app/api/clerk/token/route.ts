import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

// Returns a Clerk JWT for the signed-in user so static HTML flows can call protected APIs.
export async function GET() {
  const { userId, getToken } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const template = process.env.CLERK_JWT_TEMPLATE?.trim();
  const token = await getToken(template ? { template } : undefined);
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });
  return NextResponse.json({ token });
}

