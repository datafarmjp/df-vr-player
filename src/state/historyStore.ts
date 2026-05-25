import { PreviewEye, ProjectionMode } from "../vr/projectionModes";

const HISTORY_KEY = "vr-smb-player:history";
const ALIASES_KEY = "vr-smb-player:aliases";
const BOOKMARKS_KEY = "vr-smb-player:bookmarks";
const PLAYLIST_KEY = "vr-smb-player:playlist";
export const HISTORY_LIMIT = 50;
export const BOOKMARK_LIMIT_PER_VIDEO = 10;

export type PlaylistSortMode = "manual" | "name" | "addedAt" | "duration";
export type PlaylistSortDirection = "asc" | "desc";

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

export type PlaylistItem = {
  id: string;
  path?: string;
  url: string;
  name: string;
  folderPath: string;
  addedAt: string;
  manualOrder: number;
  projectionMode?: ProjectionMode;
  previewEye?: PreviewEye;
  flipX?: boolean;
  flipY?: boolean;
  durationSeconds?: number;
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

export type PlaylistInput = {
  path?: string;
  url: string;
  name: string;
  folderPath: string;
};

export type PlaylistCsvImportResult = {
  items: PlaylistItem[];
  aliases: Record<string, FileAlias>;
  addedCount: number;
  skippedCount: number;
};

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

function isPlaylistItem(value: unknown): value is PlaylistItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Partial<PlaylistItem>;
  return Boolean(item.id && (item.path || item.url) && item.name && item.folderPath && item.addedAt);
}

export function loadPlaylist(): PlaylistItem[] {
  try {
    const raw = localStorage.getItem(PLAYLIST_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    const normalizedItems = parsed.filter(isPlaylistItem).map((item, index) => ({
      ...item,
      id: createHistoryId(item),
      manualOrder: typeof item.manualOrder === "number" && Number.isFinite(item.manualOrder) ? item.manualOrder : index
    }));
    const next = dedupePlaylistItems(normalizedItems);
    savePlaylist(next);
    return next;
  } catch {
    return [];
  }
}

export function savePlaylist(items: PlaylistItem[]) {
  const dedupedItems = dedupePlaylistItems(items);
  try {
    localStorage.setItem(PLAYLIST_KEY, JSON.stringify(dedupedItems));
  } catch {
    const withoutThumbnails = dedupedItems.map(({ thumbnailDataUrl: _thumbnailDataUrl, ...item }) => item);
    localStorage.setItem(PLAYLIST_KEY, JSON.stringify(withoutThumbnails));
  }
}

export function addPlaylistItems(inputs: PlaylistInput[]) {
  const existingItems = loadPlaylist();
  const existingIds = new Set(existingItems.map((item) => item.id));
  const addedAt = new Date().toISOString();
  const startOrder = existingItems.reduce((maxOrder, item) => Math.max(maxOrder, item.manualOrder), -1) + 1;
  const nextItems = inputs
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "ja", { numeric: true }))
    .map((input, index) => ({
      id: createHistoryId(input),
      path: input.path,
      url: input.url,
      name: input.name,
      folderPath: input.folderPath,
      addedAt,
      manualOrder: startOrder + index,
      missing: false
    }))
    .filter((item) => !existingIds.has(item.id));
  const next = [...existingItems, ...nextItems];
  savePlaylist(next);
  return next;
}

export function buildPlaylistCsv(playlistItems: PlaylistItem[], historyItems: HistoryItem[], aliases: Record<string, FileAlias>) {
  const historyById = new Map(historyItems.map((item) => [item.id, item]));
  const header = ["order", "path", "url", "name", "alias", "projectionMode", "previewEye", "flipX", "flipY", "durationSeconds", "addedAt"];
  const rows = playlistItems
    .slice()
    .sort((a, b) => {
      const orderCompare = a.manualOrder - b.manualOrder;
      return orderCompare === 0 ? a.name.localeCompare(b.name, "ja", { numeric: true }) : orderCompare;
    })
    .map((item, index) => {
      const historyItem = historyById.get(item.id);
      const projectionMode = item.projectionMode ?? historyItem?.projectionMode ?? "";
      const previewEye = item.previewEye ?? historyItem?.previewEye ?? "";
      const flipX = typeof item.flipX === "boolean" ? item.flipX : historyItem?.flipX;
      const flipY = typeof item.flipY === "boolean" ? item.flipY : historyItem?.flipY;
      return [
        String(index + 1),
        item.path ?? "",
        item.url,
        item.name,
        getFileAlias(aliases, item)?.displayName ?? "",
        projectionMode,
        previewEye,
        typeof flipX === "boolean" ? String(flipX) : "",
        typeof flipY === "boolean" ? String(flipY) : "",
        typeof item.durationSeconds === "number" && Number.isFinite(item.durationSeconds) ? String(item.durationSeconds) : "",
        item.addedAt
      ];
    });

  return [header, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

export function importPlaylistCsv(csv: string): PlaylistCsvImportResult {
  const rows = parseCsv(csv);
  if (rows.length <= 1) {
    return {
      items: loadPlaylist(),
      aliases: loadAliases(),
      addedCount: 0,
      skippedCount: 0
    };
  }

  const header = rows[0].map((cell) => cell.trim());
  const indexOf = (key: string) => header.indexOf(key);
  const pathIndex = indexOf("path");
  const urlIndex = indexOf("url");
  const nameIndex = indexOf("name");
  const aliasIndex = indexOf("alias");
  const projectionModeIndex = indexOf("projectionMode");
  const previewEyeIndex = indexOf("previewEye");
  const flipXIndex = indexOf("flipX");
  const flipYIndex = indexOf("flipY");
  const durationIndex = indexOf("durationSeconds");
  const addedAtIndex = indexOf("addedAt");

  const existingItems = loadPlaylist();
  const existingIds = new Set(existingItems.map((item) => item.id));
  const nextItems = existingItems.slice();
  let nextOrder = existingItems.reduce((maxOrder, item) => Math.max(maxOrder, item.manualOrder), -1) + 1;
  let addedCount = 0;
  let skippedCount = 0;
  let aliases = loadAliases();

  rows.slice(1).forEach((row) => {
    const pathValue = readCsvCell(row, pathIndex);
    const urlValue = readCsvCell(row, urlIndex) || (pathValue ? createFileUrl(pathValue) : "");
    const nameValue = readCsvCell(row, nameIndex) || inferFileName(pathValue || urlValue);
    if (!urlValue || !nameValue) {
      skippedCount += 1;
      return;
    }

    const source = {
      path: pathValue || undefined,
      url: urlValue,
      name: nameValue
    };
    const id = createHistoryId(source);
    const aliasValue = readCsvCell(row, aliasIndex).trim();
    if (aliasValue) {
      aliases = setFileAliasForSource({ id, ...source }, aliasValue);
    }
    if (existingIds.has(id)) {
      skippedCount += 1;
      return;
    }

    const durationSeconds = Number(readCsvCell(row, durationIndex));
    const projectionMode = readProjectionMode(readCsvCell(row, projectionModeIndex));
    const previewEye = readPreviewEye(readCsvCell(row, previewEyeIndex));
    const nextItem: PlaylistItem = {
      id,
      path: source.path,
      url: source.url,
      name: source.name,
      folderPath: source.path ? source.path.split("/").slice(0, -1).join("/") : "",
      addedAt: readCsvCell(row, addedAtIndex) || new Date().toISOString(),
      manualOrder: nextOrder,
      projectionMode,
      previewEye,
      flipX: readBoolean(readCsvCell(row, flipXIndex)),
      flipY: readBoolean(readCsvCell(row, flipYIndex)),
      durationSeconds: Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : undefined,
      missing: false
    };
    nextOrder += 1;
    addedCount += 1;
    existingIds.add(id);
    nextItems.push(nextItem);
  });

  savePlaylist(nextItems);
  return {
    items: nextItems,
    aliases,
    addedCount,
    skippedCount
  };
}

export function clearPlaylist() {
  savePlaylist([]);
  return [];
}

export function deletePlaylistItem(id: string) {
  const normalizedId = normalizeIdentity(id);
  const next = loadPlaylist().filter((item) => item.id !== normalizedId);
  savePlaylist(next);
  return next;
}

export function attachPlaylistThumbnail(id: string, thumbnailDataUrl: string) {
  const normalizedId = normalizeIdentity(id);
  const next = loadPlaylist().map((item) => (item.id === normalizedId ? { ...item, thumbnailDataUrl } : item));
  savePlaylist(next);
  return next;
}

export function markPlaylistMissing(id: string) {
  const normalizedId = normalizeIdentity(id);
  const next = loadPlaylist().map((item) => (item.id === normalizedId ? { ...item, missing: true } : item));
  savePlaylist(next);
  return next;
}

export function updatePlaylistDuration(id: string, durationSeconds: number) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return loadPlaylist();
  }

  const normalizedId = normalizeIdentity(id);
  const next = loadPlaylist().map((item) => (item.id === normalizedId ? { ...item, durationSeconds, missing: false } : item));
  savePlaylist(next);
  return next;
}

export function updatePlaylistSettings(id: string, settings: HistorySettings) {
  const normalizedId = normalizeIdentity(id);
  const next = loadPlaylist().map((item) => (item.id === normalizedId ? { ...item, ...settings } : item));
  savePlaylist(next);
  return next;
}

export function reorderPlaylistItems(orderedIds: string[]) {
  const orderById = new Map(orderedIds.map((id, index) => [normalizeIdentity(id), index]));
  const next = loadPlaylist().map((item) => ({
    ...item,
    manualOrder: orderById.get(item.id) ?? item.manualOrder
  }));
  savePlaylist(next);
  return next;
}

export function sortPlaylistItems(items: PlaylistItem[], sortMode: PlaylistSortMode, sortDirection: PlaylistSortDirection) {
  return items.slice().sort((a, b) => {
    const applyDirection = (value: number) => sortDirection === "desc" ? -value : value;

    if (sortMode === "manual") {
      const orderCompare = a.manualOrder - b.manualOrder;
      return orderCompare === 0 ? applyDirection(a.name.localeCompare(b.name, "ja", { numeric: true })) : applyDirection(orderCompare);
    }

    if (sortMode === "addedAt") {
      const dateCompare = a.addedAt.localeCompare(b.addedAt);
      return dateCompare === 0 ? applyDirection(a.name.localeCompare(b.name, "ja", { numeric: true })) : applyDirection(dateCompare);
    }

    if (sortMode === "duration") {
      const aHasDuration = typeof a.durationSeconds === "number" && Number.isFinite(a.durationSeconds);
      const bHasDuration = typeof b.durationSeconds === "number" && Number.isFinite(b.durationSeconds);
      if (!aHasDuration && !bHasDuration) {
        return applyDirection(a.name.localeCompare(b.name, "ja", { numeric: true }));
      }
      if (!aHasDuration) {
        return 1;
      }
      if (!bHasDuration) {
        return -1;
      }
      const aDuration = a.durationSeconds ?? 0;
      const bDuration = b.durationSeconds ?? 0;
      const durationCompare = aDuration - bDuration;
      return durationCompare === 0 ? applyDirection(a.name.localeCompare(b.name, "ja", { numeric: true })) : applyDirection(durationCompare);
    }

    return applyDirection(a.name.localeCompare(b.name, "ja", { numeric: true }));
  });
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

function parseCsv(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const value = csv.replace(/^\uFEFF/, "");

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const nextChar = value[index + 1];
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((entry) => entry.trim())) {
    rows.push(row);
  }
  return rows;
}

function readCsvCell(row: string[], index: number) {
  return index >= 0 ? row[index] ?? "" : "";
}

function readProjectionMode(value: string): ProjectionMode | undefined {
  const trimmed = value.trim();
  return trimmed === "vr180-sbs" || trimmed === "vr180-tb" || trimmed === "vr180-2d" || trimmed === "vr360-sbs" || trimmed === "vr360-tb" || trimmed === "vr360-2d" || trimmed === "flat"
    ? trimmed
    : undefined;
}

function readPreviewEye(value: string): PreviewEye | undefined {
  const trimmed = value.trim();
  return trimmed === "left" || trimmed === "right" ? trimmed : undefined;
}

function readBoolean(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "true" || trimmed === "1" || trimmed === "yes") {
    return true;
  }
  if (trimmed === "false" || trimmed === "0" || trimmed === "no") {
    return false;
  }
  return undefined;
}

function createFileUrl(pathValue: string) {
  const normalizedPath = pathValue.startsWith("/") ? pathValue : `/${pathValue}`;
  return `file://${normalizedPath.split("/").map((part) => encodeURIComponent(part)).join("/")}`;
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

function dedupePlaylistItems(items: PlaylistItem[]) {
  const seen = new Set<string>();
  const next: PlaylistItem[] = [];
  items.forEach((item) => {
    const id = createHistoryId(item);
    if (seen.has(id)) {
      return;
    }
    seen.add(id);
    next.push({ ...item, id, manualOrder: typeof item.manualOrder === "number" && Number.isFinite(item.manualOrder) ? item.manualOrder : next.length });
  });
  return next;
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
