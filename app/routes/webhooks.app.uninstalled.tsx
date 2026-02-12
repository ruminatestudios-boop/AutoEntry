import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // Delete all app data so the app reliably and completely uninstalls (no code/data left behind).
  if (shop) {
    const sessions = await db.scanSession.findMany({ where: { shop }, select: { id: true } });
    const sessionIds = sessions.map((s) => s.id);
    if (sessionIds.length > 0) {
      await db.scannedProduct.deleteMany({ where: { sessionId: { in: sessionIds } } });
    }
    await db.scanSession.deleteMany({ where: { shop } });
    await db.shopSettings.deleteMany({ where: { shop } });
    await db.session.deleteMany({ where: { shop } });
  }

  return new Response();
};
