import { auth } from "@clerk/nextjs/server";

/**
 * Clerk JWT for server-side backend proxies.
 * Tries CLERK_JWT_TEMPLATE first, then default session token.
 */
export async function getClerkServerToken(): Promise<string | null> {
  const { getToken } = await auth();
  const template = process.env.CLERK_JWT_TEMPLATE?.trim();
  if (template) {
    try {
      const t = await getToken({ template });
      if (t) return t;
    } catch {
      /* fall through */
    }
  }
  try {
    return (await getToken()) ?? null;
  } catch {
    return null;
  }
}
