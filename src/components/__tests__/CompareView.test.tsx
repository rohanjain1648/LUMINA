import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompareView } from "../CompareView";

afterEach(() => vi.unstubAllGlobals());

describe("CompareView", () => {
  it("shows the comparison result after a successful compare", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          changeSummary: "Canopy coverage increased",
          confidence: 0.8,
          visualHighlights: ["denser foliage"],
        }),
      })
    );

    const user = userEvent.setup();
    render(<CompareView />);

    await user.type(screen.getByLabelText("Before asset"), "a1");
    await user.type(screen.getByLabelText("After asset"), "a2");
    await user.click(screen.getByRole("button", { name: "Compare" }));

    await waitFor(() => expect(screen.getByTestId("compare-result")).toBeInTheDocument());
    expect(screen.getByText("Canopy coverage increased")).toBeInTheDocument();
  });

  it("shows an error when the compare request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    const user = userEvent.setup();
    render(<CompareView />);

    await user.click(screen.getByRole("button", { name: "Compare" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Comparison failed"));
  });
});
