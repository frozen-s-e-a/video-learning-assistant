const MIN_HISTORY_LIMIT = 1;
const MAX_HISTORY_LIMIT = 500;

let historyWriteQueue = Promise.resolve();

export function normalizeHistoryLimit(value, defaultLimit = 50) {
  if (value === "" || value === null || value === undefined) {
    return defaultLimit;
  }

  const numericLimit = Number(value);
  if (!Number.isFinite(numericLimit)) {
    return defaultLimit;
  }

  const integerLimit = Math.trunc(numericLimit);
  return Math.min(MAX_HISTORY_LIMIT, Math.max(MIN_HISTORY_LIMIT, integerLimit));
}

export function trimHistoryEntries(entries, limit) {
  const normalizedLimit = normalizeHistoryLimit(limit);

  return [...entries]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, normalizedLimit);
}

export async function addHistoryEntry(entry, limit, storage = chrome.storage.local) {
  const write = historyWriteQueue
    .catch(() => undefined)
    .then(async () => {
      const stored = await storage.get({ historyEntries: [] });
      const nextEntries = trimHistoryEntries(
        [{ ...entry, createdAt: entry.createdAt ?? new Date().toISOString() }, ...stored.historyEntries],
        limit
      );
      await storage.set({ historyEntries: nextEntries });
      return nextEntries;
    });

  historyWriteQueue = write.catch(() => undefined);
  return write;
}

export async function clearHistory(storage = chrome.storage.local) {
  await storage.set({ historyEntries: [] });
}
