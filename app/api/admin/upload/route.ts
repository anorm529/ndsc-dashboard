import { NextResponse } from "next/server";
import { importCsv } from "@/src/lib/admin-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const resource = String(form.get("resource") ?? "");
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "CSV file is required" }, { status: 400 });
    }
    const csvText = await file.text();
    return NextResponse.json(
      await importCsv(resource, csvText, file.name, form.get("importValidOnly") === "on")
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}
