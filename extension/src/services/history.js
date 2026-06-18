export function trimHistoryEntries(entries, limit) {
  return [...entries]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export async function addHistoryEntry(entry, limit, storage = chrome.storage.local) {
  const stored = await storage.get({ historyEntries: [] });
  const nextEntries = trimHistoryEntries(
    [{ ...entry, createdAt: entry.createdAt ?? new Date().toISOString() }, ...stored.historyEntries],
    limit
  );
  await storage.set({ historyEntries: nextEntries });
  return nextEntries;
}

export async function clearHistory(storage = chrome.storage.local) {
  await storage.set({ historyEntries: [] });
}
