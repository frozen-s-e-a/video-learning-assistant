import { describe, expect, it } from "vitest";
import { trimHistoryEntries } from "../src/services/history.js";

describe("trimHistoryEntries", () => {
  it("keeps newest entries first and limits by count", () => {
    const entries = [
      { id: "old", createdAt: "2026-01-01T00:00:00.000Z" },
      { id: "new", createdAt: "2026-01-02T00:00:00.000Z" },
      { id: "middle", createdAt: "2026-01-01T12:00:00.000Z" }
    ];

    expect(trimHistoryEntries(entries, 2).map((entry) => entry.id)).toEqual([
      "new",
      "middle"
    ]);
  });
});
