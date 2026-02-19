/**
 * Layout for /webhooks. POST /webhooks is handled by webhooks._index.tsx.
 */
import { Outlet } from "@remix-run/react";

export default function WebhooksLayout() {
    return <Outlet />;
}
