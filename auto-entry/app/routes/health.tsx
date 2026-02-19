import { json, type LoaderFunctionArgs } from "@remix-run/node";

/**
 * Health check for Railway/load balancers. No auth required.
 * Returns 200 when the app is up and ready to accept requests.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  return json({ ok: true }, { status: 200 });
};
