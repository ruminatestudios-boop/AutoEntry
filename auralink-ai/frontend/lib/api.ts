/**
 * API client with optional Clerk auth.
 * Pass token from useAuth().getToken() for protected routes.
 */
/** Set NEXT_PUBLIC_API_URL on Vercel, or AURALINK_BACKEND_URL (mapped in next.config.ts). */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiFetch(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<Response> {
  const { token, ...init } = options;
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}
