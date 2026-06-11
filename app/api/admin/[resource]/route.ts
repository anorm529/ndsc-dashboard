import { NextResponse } from "next/server";
import { createRow, listRows } from "@/src/lib/admin-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ resource: string }> }
) {
  try {
    const { resource } = await params;
    return NextResponse.json(await listRows(resource));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ resource: string }> }
) {
  try {
    const { resource } = await params;
    const body = await request.json();
    return NextResponse.json(await createRow(resource, body), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}
