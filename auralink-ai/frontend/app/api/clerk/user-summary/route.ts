import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ signedIn: false }, { status: 200 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const firstName = (user.firstName || "").trim();
    const lastName = (user.lastName || "").trim();
    const email = user.primaryEmailAddress?.emailAddress || "";
    const imageUrl = user.imageUrl || "";
    const externalAccounts = Array.isArray(user.externalAccounts)
      ? user.externalAccounts
      : [];
    const hasSocialAvatar = externalAccounts.some((account) => {
      const provider = String(account.provider || "").toLowerCase();
      return provider === "oauth_google" || provider === "oauth_facebook";
    });

    return NextResponse.json({
      signedIn: true,
      firstName,
      lastName,
      email,
      imageUrl,
      hasSocialAvatar,
    });
  } catch {
    return NextResponse.json({ signedIn: false }, { status: 200 });
  }
}

