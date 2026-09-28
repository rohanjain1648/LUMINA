"use client";
import { useEffect, useState } from "react";

interface Asset {
  public_id: string;
  secure_url: string;
  context?: { custom?: Record<string, string> };
}

export function AssetGrid({ projectId }: { projectId?: string }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (projectId) params.set("project_id", projectId);
    fetch(`/api/assets?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setAssets(data.assets ?? []))
      .catch(() => setError("Failed to load assets"));
  }, [projectId]);

  if (error) return <p role="alert">{error}</p>;
  if (assets.length === 0) return <p>No assets found.</p>;

  return (
    <ul data-testid="asset-grid">
      {assets.map((asset) => (
        <li key={asset.public_id}>
          <img src={asset.secure_url} alt={asset.context?.custom?.caption ?? asset.public_id} />
          <span>{asset.context?.custom?.caption}</span>
        </li>
      ))}
    </ul>
  );
}
