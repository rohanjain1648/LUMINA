export interface AssetMetadata {
  publicId: string;
  projectId: string;
  location: { name: string; lat?: number; lng?: number };
  capturedAt: string;
  uploader: string;
  activityTags: string[];
  aiTags: string[];
  caption: string;
  seriesId: string;
  sourceRef: string;
  secureUrl: string;
}

export interface CompareResult {
  changeSummary: string;
  confidence: number;
  visualHighlights: string[];
}

export interface ReportData {
  id: string;
  projectId: string;
  from: string;
  to: string;
  summary: string;
  assets: AssetMetadata[];
  createdAt: string;
}
