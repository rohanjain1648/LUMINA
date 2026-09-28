import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AssetGrid } from "../AssetGrid";

afterEach(() => vi.unstubAllGlobals());

describe("AssetGrid", () => {
  it("renders assets returned by /api/assets", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          assets: [
            { public_id: "a1", secure_url: "https://x/a1.jpg", context: { custom: { caption: "Flooded field" } } },
          ],
        }),
      })
    );

    render(<AssetGrid />);

    await waitFor(() => expect(screen.getByTestId("asset-grid")).toBeInTheDocument());
    expect(screen.getByText("Flooded field")).toBeInTheDocument();
  });

  it("shows an empty state when there are no assets", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ assets: [] }) }));

    render(<AssetGrid />);

    await waitFor(() => expect(screen.getByText("No assets found.")).toBeInTheDocument());
  });

  it("shows an error message when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    render(<AssetGrid />);

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Failed to load assets"));
  });
});
