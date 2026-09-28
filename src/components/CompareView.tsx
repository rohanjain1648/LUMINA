"use client";
import { useState } from "react";
import type { CompareResult } from "@/lib/types";

export function CompareView() {
  const [assetA, setAssetA] = useState("");
  const [assetB, setAssetB] = useState("");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runCompare() {
    setError(null);
    setResult(null);
    const res = await fetch("/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetA, assetB }),
    });
    if (!res.ok) {
      setError("Comparison failed");
      return;
    }
    setResult(await res.json());
  }

  return (
    <div>
      <input aria-label="Before asset" value={assetA} onChange={(e) => setAssetA(e.target.value)} />
      <input aria-label="After asset" value={assetB} onChange={(e) => setAssetB(e.target.value)} />
      <button onClick={runCompare}>Compare</button>
      {error && <p role="alert">{error}</p>}
      {result && (
        <div data-testid="compare-result">
          <p>{result.changeSummary}</p>
          <p>Confidence: {result.confidence}</p>
          <ul>
            {Array.isArray(result.visualHighlights) &&
              result.visualHighlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
