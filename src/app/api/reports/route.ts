import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { searchAssets } from "@/lib/cloudinary";
import { draftReportSummary } from "@/lib/claudeClient";
import { saveReport } from "@/lib/reportStore";
import type { ReportData, AssetMetadata } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { projectId, from, to } = await request.json();
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const cloudinaryAssets = await searchAssets({ projectId, from, to });

  if (cloudinaryAssets.length === 0) {
    const empty: ReportData = {
      id: randomUUID(),
      projectId,
      from: from ?? "",
      to: to ?? "",
      summary: "No assets found for this project and date range.",
      assets: [],
      createdAt: new Date().toISOString(),
    };
    saveReport(empty);
    return NextResponse.json(empty);
  }

  const assets: AssetMetadata[] = cloudinaryAssets.map((a) => ({
    publicId: a.public_id,
    projectId,
    location: { name: a.context?.custom?.location ?? "" },
    capturedAt: a.context?.custom?.captured_at ?? "",
    uploader: a.context?.custom?.uploader ?? "",
    activityTags: a.tags ?? [],
    aiTags: (a.context?.custom?.ai_tags ?? "").split("|").filter(Boolean),
    caption: a.context?.custom?.caption ?? "",
    seriesId: a.context?.custom?.series_id ?? "",
    sourceRef: a.context?.custom?.source_ref ?? "",
    secureUrl: a.secure_url,
  }));

  let summary: string;
  try {
    summary = await draftReportSummary(assets.map((a) => ({ caption: a.caption, aiTags: a.aiTags })));
  } catch {
    summary = assets
      .map((a) => a.caption)
      .filter(Boolean)
      .join(". ");
  }

  const report: ReportData = {
    id: randomUUID(),
    projectId,
    from: from ?? "",
    to: to ?? "",
    summary,
    assets,
    createdAt: new Date().toISOString(),
  };
  saveReport(report);
  return NextResponse.json(report);
}
