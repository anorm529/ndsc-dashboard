import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const base = process.env.APPS_SCRIPT_URL;

  if (!base) {
    return NextResponse.json(
      { error: "Missing APPS_SCRIPT_URL env var" },
      { status: 500 }
    );
  }

  try {
    // cache-bust so nothing (browser/CDN/Google) serves stale data
    const url = `${base}?t=${Date.now()}`;

    const upstream = await fetch(url, { cache: "no-store" });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      return NextResponse.json(
        { error: `Apps Script returned ${upstream.status}`, details: text.slice(0, 200) },
        { status: 502 }
      );
    }

    const data = await upstream.json();

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unknown proxy error" },
      { status: 500 }
    );
  }
}
