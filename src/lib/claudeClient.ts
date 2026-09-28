import Groq from "groq-sdk";
import type { CompareResult } from "./types";

const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

interface ChatCompletionResponse {
  choices: { message: { content: string | null } }[];
}

let defaultClient: Groq | null = null;

function getDefaultClient(): Groq {
  if (!defaultClient) {
    defaultClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return defaultClient;
}

function extractText(response: ChatCompletionResponse): string {
  return response.choices[0]?.message?.content ?? "{}";
}

export async function tagImage(
  imageUrl: string,
  projectHint: string,
  client?: Groq
): Promise<{ aiTags: string[]; caption: string }> {
  const c = client || getDefaultClient();
  const response = await c.chat.completions.create({
    model: MODEL,
    max_tokens: 300,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageUrl } },
          {
            type: "text",
            text: `This photo is from a sustainability/field project. Project hint: "${projectHint}". Return strict JSON only: {"aiTags": string[], "caption": string}. Tags should describe sustainability-relevant activities/signals (e.g. reforestation, flood damage, solar install).`,
          },
        ],
      },
    ],
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractText(response));
  } catch {
    parsed = {};
  }
  const obj = (parsed && typeof parsed === "object" ? parsed : {}) as {
    aiTags?: unknown;
    caption?: unknown;
  };
  return {
    aiTags: Array.isArray(obj.aiTags) ? (obj.aiTags as string[]) : [],
    caption: typeof obj.caption === "string" ? obj.caption : "",
  };
}

export async function compareImages(
  urlA: string,
  urlB: string,
  client?: Groq
): Promise<CompareResult> {
  const c = client || getDefaultClient();
  const response = await c.chat.completions.create({
    model: MODEL,
    max_tokens: 400,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: urlA } },
          { type: "image_url", image_url: { url: urlB } },
          {
            type: "text",
            text: `These two photos were taken at the same location at different times (first is "before", second is "after"). Describe what changed, quantify where possible, and rate your confidence from 0 to 1. Return strict JSON only: {"changeSummary": string, "confidence": number, "visualHighlights": string[]}.`,
          },
        ],
      },
    ],
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractText(response));
  } catch {
    parsed = {};
  }
  const obj = (parsed && typeof parsed === "object" ? parsed : {}) as {
    changeSummary?: unknown;
    confidence?: unknown;
    visualHighlights?: unknown;
  };
  return {
    changeSummary: typeof obj.changeSummary === "string" ? obj.changeSummary : "",
    confidence: typeof obj.confidence === "number" ? obj.confidence : 0,
    visualHighlights: Array.isArray(obj.visualHighlights) ? (obj.visualHighlights as string[]) : [],
  };
}

export async function draftReportSummary(
  assets: { caption: string; aiTags: string[] }[],
  client?: Groq
): Promise<string> {
  const c = client || getDefaultClient();
  const context = assets.map((a) => `- ${a.caption} [${a.aiTags.join(", ")}]`).join("\n");
  const response = await c.chat.completions.create({
    model: MODEL,
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `Draft a short impact report (3-4 paragraphs) summarizing this field evidence for a sustainability project:\n${context}`,
      },
    ],
  });
  return extractText(response);
}
