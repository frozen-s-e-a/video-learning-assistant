import { describe, expect, it } from "vitest";
import {
  addHistoryEntry,
  normalizeHistoryLimit,
  trimHistoryEntries
} from "../src/services/history.js";

function createMemoryStorage(initialEntries = []) {
  const state = {
    historyEntries: initialEntries
  };

  return {
    async get(defaults) {
      return {
        ...defaults,
        historyEntries: [...state.historyEntries]
      };
    },
    async set(values) {
      state.historyEntries = [...values.historyEntries];
    },
    entries() {
      return state.historyEntries;
    }
  };
}

describe("normalizeHistoryLimit", () => {
  it("defaults malformed limits and clamps to the supported range", () => {
    expect(normalizeHistoryLimit("")).toBe(50);
    expect(normalizeHistoryLimit("abc")).toBe(50);
    expect(normalizeHistoryLimit(0)).toBe(1);
    expect(normalizeHistoryLimit(-10)).toBe(1);
    expect(normalizeHistoryLimit(501)).toBe(500);
    expect(normalizeHistoryLimit("7.8")).toBe(7);
  });
});

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

  it("uses a safe default for malformed limits", () => {
    const entries = Array.from({ length: 60 }, (_, index) => ({
      id: String(index),
      createdAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString()
    }));

    expect(trimHistoryEntries(entries, Number.NaN)).toHaveLength(50);
  });
});

describe("addHistoryEntry", () => {
  it("serializes concurrent writes so entries are not lost", async () => {
    const storage = createMemoryStorage();

    const [firstEntries, secondEntries] = await Promise.all([
      addHistoryEntry({ id: "first", createdAt: "2026-01-01T00:00:00.000Z" }, 50, storage),
      addHistoryEntry({ id: "second", createdAt: "2026-01-02T00:00:00.000Z" }, 50, storage)
    ]);

    expect(firstEntries.map((entry) => entry.id)).toEqual(["first"]);
    expect(secondEntries.map((entry) => entry.id)).toEqual(["second", "first"]);
    expect(storage.entries().map((entry) => entry.id)).toEqual(["second", "first"]);
  });

  it("normalizes malformed limits before storing", async () => {
    const storage = createMemoryStorage(
      Array.from({ length: 60 }, (_, index) => ({
        id: `stored-${index}`,
        createdAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString()
      }))
    );

    const entries = await addHistoryEntry(
      { id: "new", createdAt: "2026-03-01T00:00:00.000Z" },
      "",
      storage
    );

    expect(entries).toHaveLength(50);
    expect(entries[0].id).toBe("new");
  });
});
