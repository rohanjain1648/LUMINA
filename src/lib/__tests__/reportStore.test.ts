import { describe, it, expect } from "vitest";
import { saveReport, getReport } from "../reportStore";

describe("reportStore", () => {
  it("returns a saved report by id", () => {
    saveReport({
      id: "r1",
      projectId: "flood-relief",
      from: "2026-01-01",
      to: "2026-02-01",
      summary: "summary",
      assets: [],
      createdAt: "2026-02-01T00:00:00.000Z",
    });
    expect(getReport("r1")?.summary).toBe("summary");
  });

  it("returns undefined for an unknown id", () => {
    expect(getReport("does-not-exist")).toBeUndefined();
  });
});
