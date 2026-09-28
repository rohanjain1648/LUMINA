import { describe, it, expect, vi } from "vitest";
import { tagImage, compareImages, draftReportSummary } from "../claudeClient";

function fakeClient(text: string) {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({ choices: [{ message: { content: text } }] }),
      },
    },
  } as any;
}

describe("claudeClient", () => {
  it("tagImage parses the JSON response", async () => {
    const client = fakeClient('{"aiTags":["reforestation"],"caption":"New saplings planted"}');
    const result = await tagImage("https://example.com/a.jpg", "reforestation project", client);
    expect(result).toEqual({ aiTags: ["reforestation"], caption: "New saplings planted" });
  });

  it("compareImages parses the JSON response", async () => {
    const client = fakeClient(
      '{"changeSummary":"Canopy coverage increased","confidence":0.8,"visualHighlights":["denser foliage"]}'
    );
    const result = await compareImages("https://example.com/a.jpg", "https://example.com/b.jpg", client);
    expect(result.confidence).toBe(0.8);
    expect(result.changeSummary).toContain("Canopy");
  });

  it("draftReportSummary returns the raw text response", async () => {
    const client = fakeClient("This project shows strong visible progress.");
    const summary = await draftReportSummary([{ caption: "Trees planted", aiTags: ["reforestation"] }], client);
    expect(summary).toBe("This project shows strong visible progress.");
  });
});
