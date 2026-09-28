import type { ReportData } from "./types";

const reports = new Map<string, ReportData>();

export function saveReport(report: ReportData): void {
  reports.set(report.id, report);
}

export function getReport(id: string): ReportData | undefined {
  return reports.get(id);
}
