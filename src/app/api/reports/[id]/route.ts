import { NextRequest, NextResponse } from "next/server";
import { getReport } from "@/lib/reportStore";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = getReport(id);
  if (!report) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(report);
}
