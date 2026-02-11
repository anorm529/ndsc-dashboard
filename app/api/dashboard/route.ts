import { NextResponse } from "next/server";

export const runtime = "nodejs"; // safest on Vercel

export async function GET() {
  const url = process.env.APPS_SCRIPT_URL;

  if (!url) {
    return NextResponse.json(
      { error: "Missing APPS_SCRIPT_URL env var" },
      { status: 500 }
    );
  }

  try {
    const upstream = await fetch(url, {
      // This makes Vercel cache for 60 seconds, then refresh
      next: { revalidate: 60 },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Apps Script returned ${upstream.status}` },
        { status: 502 }
      );
    }

    const data = await upstream.json();

    return NextResponse.json(data, {
      headers: {
        // Helps browsers + CDNs behave nicely
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unknown proxy error" },
      { status: 500 }
    );
  }
}
