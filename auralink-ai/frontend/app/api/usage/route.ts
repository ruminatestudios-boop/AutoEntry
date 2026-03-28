import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function getBackendBaseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    process.env.AURALINK_BACKEND_URL?.trim() ||
    "http://localhost:8000";
  return raw.replace(/\/$/, "");
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader) {
    return NextResponse.json({ error: "Missing authorization" }, { status: 401 });
  }

  try {
    const backendUrl = `${getBackendBaseUrl()}/api/v1/usage`;
    const upstream = await fetch(backendUrl, {
      method: "GET",
      headers: {
        Authorization: authHeader,
      },
      cache: "no-store",
    });

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") || "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Upstream usage request failed" }, { status: 502 });
  }
}

