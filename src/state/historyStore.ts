import { PreviewEye, ProjectionMode } from "../vr/projectionModes";

const HISTORY_KEY = "vr-smb-player:history";
const ALIASES_KEY = "vr-smb-player:aliases";
const BOOKMARKS_KEY = "vr-smb-player:bookmarks";
export const HISTORY_LIMIT = 50;
export const BOOKMARK_LIMIT_PER_VIDEO = 10;

export type HistoryItem = {
  id: string;
  path?: string;
  url: string;
  name: string;
  lastOpenedAt: string;
  projectionMode: ProjectionMode;
  previewEye: PreviewEye;
  flipX: boolean;
  flipY: boolean;
  thumbnailDataUrl?: string;
  missing?: boolean;
};

export type BookmarkItem = {
  id: string;
  sourceId: string;
  path?: string;
  url: string;
  name: string;
  timeSeconds: number;
  displayName: string;
  createdAt: string;
  projectionMode: ProjectionMode;
  previewEye: PreviewEye;
  flipX: boolean;
  flipY: boolean;
  thumbnailDataUrl?: string;
  missing?: boolean;
};

export type FileAlias = {
  id: string;
  displayName: string;
  updatedAt: string;
};

export type AliasManagerRow = {
  keys: string[];
  fileName: string;
  displayName: string;
  updatedAt: string;
};

export type AliasSource = Pick<HistoryItem, "id" | "path" | "url" | "name">;

export type HistorySettings = Pick<HistoryItem, "projectionMode" | "previewEye" | "flipX" | "flipY">;

export type HistoryUpsertInput = {
  path?: string;
  url: string;
  name: string;
} & HistorySettings;

export type BookmarkInput = {
  path?: string;
  url: string;
  name: string;
  timeSeconds: number;
  displayName: string;
} & HistorySettings;

const normalizePath = (path: string) => normalizeIdentity(path);

function normalizeIdentity(value: string) {
  const trimmed = value.trim().normalize("NFC");
  if (trimmed.startsWith("file:")) {
    try {
      return decodeURIComponent(new URL(trimmed).pathname).normalize("NFC");
    } catch {
      return trimmed;
    }
  }

  if (trimmed.startsWith("smb:")) {
    try {
      const url = new URL(trimmed);
      const parts = url.pathname.split("/").filter(Boolean).map((part) => decodeURIComponent(part));
      if (parts.length > 0) {
        return `/Volumes/${parts.join("/")}`.normalize("NFC");
      }
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

export function createHistoryId(source: Pick<HistoryItem, "path" | "url" | "name">) {
  return normalizeIdentity(source.path || source.url || source.name);
}

export function getSourceId(source: Pick<HistoryItem, "path" | "url" | "name">) {
  return createHistoryId(source);
}

export function getAliasKeys(source: Partial<AliasSource>) {
  return Array.from(new Set([source.id, source.path, source.url, source.name].filter((value): value is string => Boolean(value?.trim())).map(normalizeIdentity)));
}

export function getFileAlias(aliases: Record<string, FileAlias>, source: Partial<AliasSource>) {
  const keys = getAliasKeys(source);
  return keys.map((key) => aliases[key]).find(Boolean);
}

function isHistoryItem(value: unknown): value is HistoryItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Partial<HistoryItem>;
  return Boolean((item.path || item.url) && item.name && item.lastOpenedAt);
}

export function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    const normalizedItems = parsed.filter(isHistoryItem).map((item) => ({
      ...item,
      id: createHistoryId(item)
    }));
    return dedupeHistoryItems(normalizedItems).slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export function saveHistory(items: HistoryItem[]) {
  const limitedItems = items.slice(0, HISTORY_LIMIT);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(limitedItems));
  } catch {
    const withoutThumbnails = limitedItems.map(({ thumbnailDataUrl: _thumbnailDataUrl, ...item }) => item);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(withoutThumbnails));
  }
}

export function upsertHistoryItem(input: HistoryUpsertInput) {
  const id = createHistoryId(input);
  const items = loadHistory();
  const inputKeys = getHistoryMatchKeys({ id, ...input });
  const existing = items.find((item) => hasMatchingHistoryKey(inputKeys, item));
  const nextItem: HistoryItem = {
    id,
    path: input.path,
    url: input.url,
    name: input.name,
    lastOpenedAt: new Date().toISOString(),
    projectionMode: input.projectionMode,
    previewEye: input.previewEye,
    flipX: input.flipX,
    flipY: input.flipY,
    thumbnailDataUrl: existing?.thumbnailDataUrl,
    missing: false
  };
  const next = [nextItem, ...items.filter((item) => !hasMatchingHistoryKey(inputKeys, item))].slice(0, HISTORY_LIMIT);
  saveHistory(next);
  return next;
}

export function attachThumbnail(path: string, thumbnailDataUrl: string) {
  const id = normalizePath(path);
  const next = loadHistory().map((item) => (item.id === id ? { ...item, thumbnailDataUrl } : item));
  saveHistory(next);
  return next;
}

export function updateHistorySettings(path: string, settings: HistorySettings) {
  const id = normalizePath(path);
  const next = loadHistory().map((item) => (item.id === id ? { ...item, ...settings } : item));
  saveHistory(next);
  return next;
}

export function markHistoryMissing(path: string) {
  const id = normalizePath(path);
  const next = loadHistory().map((item) => (item.id === id ? { ...item, missing: true } : item));
  saveHistory(next);
  return next;
}

export function deleteHistoryItem(id: string) {
  const next = loadHistory().filter((item) => item.id !== id);
  saveHistory(next);
  return next;
}

export function clearHistory() {
  saveHistory([]);
  return [];
}

function isBookmarkItem(value: unknown): value is BookmarkItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Partial<BookmarkItem>;
  return Boolean(item.id && item.sourceId && (item.path || item.url) && item.name && item.displayName && item.createdAt && typeof item.timeSeconds === "number");
}

export function loadBookmarks(): BookmarkItem[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isBookmarkItem);
  } catch {
    return [];
  }
}

export function saveBookmarks(items: BookmarkItem[]) {
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(items));
  } catch {
    const withoutThumbnails = items.map(({ thumbnailDataUrl: _thumbnailDataUrl, ...item }) => item);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(withoutThumbnails));
  }
}

export function addBookmark(input: BookmarkInput) {
  const sourceId = createHistoryId(input);
  const createdAt = new Date().toISOString();
  const bookmark: BookmarkItem = {
    id: `${sourceId}#${createdAt}#${Math.round(input.timeSeconds * 1000)}`,
    sourceId,
    path: input.path,
    url: input.url,
    name: input.name,
    timeSeconds: input.timeSeconds,
    displayName: input.displayName,
    createdAt,
    projectionMode: input.projectionMode,
    previewEye: input.previewEye,
    flipX: input.flipX,
    flipY: input.flipY,
    missing: false
  };
  const items = loadBookmarks();
  const sameSource = [bookmark, ...items.filter((item) => item.sourceId === sourceId)].slice(0, BOOKMARK_LIMIT_PER_VIDEO);
  const next = [...sameSource, ...items.filter((item) => item.sourceId !== sourceId)].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  saveBookmarks(next);
  return { items: next, bookmark };
}

export function attachBookmarkThumbnail(id: string, thumbnailDataUrl: string) {
  const next = loadBookmarks().map((item) => (item.id === id ? { ...item, thumbnailDataUrl } : item));
  saveBookmarks(next);
  return next;
}

export function updateBookmarkName(id: string, displayName: string) {
  const trimmed = displayName.trim();
  const next = loadBookmarks().map((item) => (item.id === id ? { ...item, displayName: trimmed || item.displayName } : item));
  saveBookmarks(next);
  return next;
}

export function deleteBookmark(id: string) {
  const next = loadBookmarks().filter((item) => item.id !== id);
  saveBookmarks(next);
  return next;
}

export function clearBookmarks() {
  saveBookmarks([]);
  return [];
}

export function markBookmarkMissing(id: string) {
  const next = loadBookmarks().map((item) => (item.id === id ? { ...item, missing: true } : item));
  saveBookmarks(next);
  return next;
}

export function loadAliases(): Record<string, FileAlias> {
  try {
    const raw = localStorage.getItem(ALIASES_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return parsed as Record<string, FileAlias>;
  } catch {
    return {};
  }
}

export function saveAliases(aliases: Record<string, FileAlias>) {
  localStorage.setItem(ALIASES_KEY, JSON.stringify(aliases));
}

export function setFileAliasForSource(source: Partial<AliasSource>, displayName: string) {
  const aliases = loadAliases();
  const trimmed = displayName.trim();
  const keys = getAliasKeys(source);
  if (!trimmed) {
    keys.forEach((key) => {
      delete aliases[key];
    });
  } else {
    const updatedAt = new Date().toISOString();
    keys.forEach((key) => {
      aliases[key] = {
        id: key,
        displayName: trimmed,
        updatedAt
      };
    });
  }
  saveAliases(aliases);
  return aliases;
}

export function updateAliasKeys(keys: string[], displayName: string) {
  const aliases = loadAliases();
  const trimmed = displayName.trim();
  const updatedAt = new Date().toISOString();

  keys.forEach((key) => {
    if (!trimmed) {
      delete aliases[key];
      return;
    }

    aliases[key] = {
      id: key,
      displayName: trimmed,
      updatedAt
    };
  });

  saveAliases(aliases);
  return aliases;
}

export function deleteAliasKeys(keys: string[]) {
  const aliases = loadAliases();
  keys.forEach((key) => {
    delete aliases[key];
  });
  saveAliases(aliases);
  return aliases;
}

export function buildAliasManagerRows(historyItems: HistoryItem[], aliases: Record<string, FileAlias>): AliasManagerRow[] {
  const fileNameByAliasKey = new Map<string, string>();

  historyItems.forEach((item) => {
    getAliasKeys(item).forEach((key) => {
      fileNameByAliasKey.set(key, item.name);
    });
  });

  const rows = new Map<string, AliasManagerRow>();
  Object.values(aliases).forEach((alias) => {
    const fileName = fileNameByAliasKey.get(alias.id) ?? inferFileName(alias.id);
    const rowKey = `${fileName}\u0000${alias.displayName}`;
    const existing = rows.get(rowKey);
    if (existing) {
      existing.keys.push(alias.id);
      if (alias.updatedAt > existing.updatedAt) {
        existing.updatedAt = alias.updatedAt;
      }
      return;
    }

    rows.set(rowKey, {
      keys: [alias.id],
      fileName,
      displayName: alias.displayName,
      updatedAt: alias.updatedAt
    });
  });

  return Array.from(rows.values()).sort((a, b) => {
    const fileCompare = a.fileName.localeCompare(b.fileName, "ja");
    return fileCompare === 0 ? a.displayName.localeCompare(b.displayName, "ja") : fileCompare;
  });
}

export function buildAliasCsvRows(historyItems: HistoryItem[], aliases: Record<string, FileAlias>) {
  return buildAliasManagerRows(historyItems, aliases).map((row) => ({
    fileName: row.fileName,
    alias: row.displayName
  }));
}

export function buildAliasCsv(historyItems: HistoryItem[], aliases: Record<string, FileAlias>) {
  const rows = buildAliasCsvRows(historyItems, aliases);
  const header = ["fileName", "alias"];
  return [header, ...rows.map((row) => [row.fileName, row.alias])].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

function escapeCsvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function inferFileName(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol === "file:") {
      return decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) ?? value);
    }
  } catch {
    // Not a URL.
  }

  return value.split("/").filter(Boolean).at(-1) ?? value;
}

function getHistoryMatchKeys(source: Partial<AliasSource>) {
  const keys = [source.id, source.path, source.url].filter((value): value is string => Boolean(value?.trim())).map(normalizeIdentity);
  const hasStablePath = Boolean(source.path || source.url?.startsWith("file:"));
  if (source.name && !hasStablePath) {
    keys.push(normalizeIdentity(source.name));
  }
  return Array.from(new Set(keys));
}

function hasMatchingHistoryKey(keys: string[], item: HistoryItem) {
  const itemKeys = getHistoryMatchKeys(item);
  if (itemKeys.some((key) => keys.includes(key))) {
    return true;
  }

  const hasStablePath = Boolean(item.path || item.url?.startsWith("file:"));
  return !hasStablePath && Boolean(item.name && keys.includes(normalizeIdentity(item.name)));
}

function dedupeHistoryItems(items: HistoryItem[]) {
  return items.reduce<HistoryItem[]>((result, item) => {
    const keys = getHistoryMatchKeys(item);
    if (!result.some((existing) => hasMatchingHistoryKey(keys, existing))) {
      result.push(item);
    }
    return result;
  }, []);
}
