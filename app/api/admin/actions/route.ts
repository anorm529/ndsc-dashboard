import { NextResponse } from "next/server";
import { runStatsAction } from "@/src/lib/admin-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action") ?? "";
    const body = await request.json().catch(() => ({}));
    return NextResponse.json(await runStatsAction(action, body));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}
