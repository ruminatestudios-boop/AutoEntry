import { auth } from "@clerk/nextjs/server";
import { getPublishingJwtSecret, signPublishingJwt } from "@/lib/publishingJwt";

/** Mint a publishing JWT from the current Clerk session (server-side only). */
export async function mintPublishingJwtForRequest(): Promise<{
  token: string;
  userId: string;
} | null> {
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
  } catch {
    userId = null;
  }
  if (!userId && process.env.NODE_ENV !== "production") {
    userId = "dev-local";
  }
  if (!userId) return null;

  const secret = getPublishingJwtSecret();
  if (!secret) return null;

  const now = Math.floor(Date.now() / 1000);
  const token = signPublishingJwt(
    {
      sub: userId,
      userId,
      iat: now,
      exp: now + 60 * 60 * 24 * 7,
      source: "clerk",
    },
    secret
  );
  return { token, userId };
}
