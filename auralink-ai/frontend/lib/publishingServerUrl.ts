import {
  CANONICAL_PUBLISHING_URL,
  resolvePublishingBaseUrl,
} from "@/lib/canonicalPublishingUrl";

export function publishingServerBaseUrl(): string {
  return resolvePublishingBaseUrl(
    process.env.PUBLISHING_APP_URL,
    process.env.PUBLISHING_PROXY_TARGET,
    process.env.VERCEL === "1" ? CANONICAL_PUBLISHING_URL : null,
    process.env.NEXT_PUBLIC_PUBLISHING_API_URL
  );
}
