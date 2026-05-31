import { useEffect, useMemo, useRef, useState } from "react";
import { PanelRightClose, PanelRightOpen, Settings } from "lucide-react";
import { AliasManagerModal } from "./components/AliasManagerModal";
import { ControlBar } from "./components/ControlBar";
import { HistoryPanel } from "./components/HistoryPanel";
import { PlayerView } from "./components/PlayerView";
import { ProjectionModeSelector } from "./components/ProjectionModeSelector";
import { RenameAliasModal } from "./components/RenameAliasModal";
import { RenameBookmarkModal } from "./components/RenameBookmarkModal";
import { SettingsModal } from "./components/SettingsModal";
import { useI18n } from "./i18n";
import {
  addBookmark,
  addPlaylistItems,
  attachPlaylistThumbnail,
  attachThumbnail,
  attachBookmarkThumbnail,
  BookmarkItem,
  buildAliasManagerRows,
  buildAliasCsv,
  buildPlaylistCsv,
  clearBookmarks,
  clearHistory,
  clearPlaylist,
  deleteBookmark,
  deleteAliasKeys,
  deleteHistoryItem,
  deletePlaylistItem,
  AliasManagerRow,
  FileAlias,
  getFileAlias,
  getSourceId,
  HistoryItem,
  HistorySettings,
  importPlaylistCsv,
  loadAliases,
  loadBookmarks,
  loadHistory,
  loadPlaylist,
  markBookmarkMissing,
  markHistoryMissing,
  markPlaylistMissing,
  PlaylistItem,
  PlaylistSortDirection,
  PlaylistSortMode,
  reorderPlaylistItems,
  setFileAliasForSource,
  sortPlaylistItems,
  updateAliasKeys,
  updateBookmarkName,
  updateHistoryDuration,
  updateHistorySettings,
  updatePlaylistDuration,
  updatePlaylistSettings,
  upsertHistoryItem
} from "./state/historyStore";
import { SidePanelTab } from "./components/HistoryPanel";
import { createVideoThumbnail } from "./vr/createThumbnail";
import { detectProjectionModeFromName, detectProjectionModeFromVideoSize } from "./vr/detectProjectionMode";
import { PreviewEye, ProjectionMode } from "./vr/projectionModes";

type VideoSource = {
  path?: string;
  url: string;
  name: string;
  remember: boolean;
};

const APP_BUILD = "2026-05-31 settings-panel-1";
const APP_VERSION = "0.1.11";
const SUPPORT_URL = "https://buy.stripe.com/bJe4gyb7O6Gj66jbh49ws05";
const videoExtensions = [".mp4", ".mov", ".m4v", ".webm"];
const HISTORY_PANEL_VISIBLE_KEY = "vr-smb-player:history-panel-visible";
const HISTORY_PANEL_WIDTH_KEY = "vr-smb-player:history-panel-width";
const PLAYLIST_SORT_KEY = "vr-smb-player:playlist-sort";
const PLAYLIST_SORT_DIRECTION_KEY = "vr-smb-player:playlist-sort-direction";
const PLAYBACK_RATE_KEY = "vr-smb-player:playback-rate";
const VOLUME_KEY = "vr-smb-player:volume";
const MUTED_KEY = "vr-smb-player:muted";
const DISMISSED_RELEASE_TAG_KEY = "vr-smb-player:dismissed-release-tag";
const LATEST_RELEASE_URL = "https://info.datafarm.jp/media/releases/DF_VRPlayer/latest.json";
const minHistoryPanelWidth = 300;
const maxHistoryPanelWidth = 620;
const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2];

type ReleaseInfo = {
  product: string;
  display_name: string;
  version: string;
  tag: string;
  date: string;
  title: string;
  github_release_url: string;
  download_url: string;
  changes: string[];
  body_markdown: string;
};

const formatBookmarkTime = (value: number) => {
  const totalSeconds = Math.max(0, Math.floor(value));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const isVideoFile = (file: File) => {
  const lowerName = file.name.toLowerCase();
  return videoExtensions.some((extension) => lowerName.endsWith(extension));
};

const isPlaylistSortMode = (value: string | null): value is PlaylistSortMode => value === "manual" || value === "name" || value === "addedAt" || value === "duration";
const isPlaylistSortDirection = (value: string | null): value is PlaylistSortDirection => value === "asc" || value === "desc";

const compareVersions = (a: string, b: string) => {
  const aParts = a.split(".").map((part) => Number(part));
  const bParts = b.split(".").map((part) => Number(part));
  const length = Math.max(aParts.length, bParts.length);
  for (let index = 0; index < length; index += 1) {
    const aValue = Number.isFinite(aParts[index]) ? aParts[index] : 0;
    const bValue = Number.isFinite(bParts[index]) ? bParts[index] : 0;
    if (aValue !== bValue) {
      return aValue - bValue;
    }
  }
  return 0;
};

const isReleaseInfo = (value: unknown): value is ReleaseInfo => {
  const release = value as Partial<ReleaseInfo>;
  return Boolean(
    release &&
      typeof release === "object" &&
      release.product === "DF_VRPlayer" &&
      typeof release.version === "string" &&
      typeof release.tag === "string" &&
      typeof release.title === "string" &&
      typeof release.github_release_url === "string" &&
      typeof release.download_url === "string" &&
      Array.isArray(release.changes)
  );
};

export function App() {
  const { language, t } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const playlistCsvInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const pendingAutoPlayRef = useRef(false);
  const pendingSeekRef = useRef<number | null>(null);
  const pendingPlayAfterSeekRef = useRef(false);
  const currentBookmarkOpenRef = useRef<string | null>(null);
  const pendingProjectionDetectionRef = useRef<{ sourceId: string } | null>(null);
  const dragStartRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [currentSourceId, setCurrentSourceId] = useState<string | null>(null);
  const [currentSourceName, setCurrentSourceName] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [projectionMode, setProjectionMode] = useState<ProjectionMode>("vr180-sbs");
  const [previewEye, setPreviewEye] = useState<PreviewEye>("left");
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(() => {
    const storedVolume = Number(localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(storedVolume) ? Math.min(Math.max(storedVolume, 0), 1) : 0.8;
  });
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem(MUTED_KEY) === "true");
  const [playbackRate, setPlaybackRate] = useState(() => {
    const storedRate = Number(localStorage.getItem(PLAYBACK_RATE_KEY));
    return playbackRates.includes(storedRate) ? storedRate : 1;
  });
  const [resetSignal, setResetSignal] = useState(0);
  const [zoomResetSignal, setZoomResetSignal] = useState(0);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>(() => loadHistory());
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() => loadBookmarks());
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>(() => loadPlaylist());
  const [playlistSortMode, setPlaylistSortMode] = useState<PlaylistSortMode>(() => {
    const storedSortMode = localStorage.getItem(PLAYLIST_SORT_KEY);
    return isPlaylistSortMode(storedSortMode) ? storedSortMode : "name";
  });
  const [playlistSortDirection, setPlaylistSortDirection] = useState<PlaylistSortDirection>(() => {
    const storedSortDirection = localStorage.getItem(PLAYLIST_SORT_DIRECTION_KEY);
    return isPlaylistSortDirection(storedSortDirection) ? storedSortDirection : "asc";
  });
  const [aliases, setAliases] = useState<Record<string, FileAlias>>(() => loadAliases());
  const [historyDiagnostics, setHistoryDiagnostics] = useState<Record<string, string>>({});
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const [isAliasManagerOpen, setIsAliasManagerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [renamingHistoryItem, setRenamingHistoryItem] = useState<HistoryItem | null>(null);
  const [renamingBookmarkItem, setRenamingBookmarkItem] = useState<BookmarkItem | null>(null);
  const [availableRelease, setAvailableRelease] = useState<ReleaseInfo | null>(null);
  const [activeSidePanelTab, setActiveSidePanelTab] = useState<SidePanelTab>("history");
  const activeSidePanelTabRef = useRef<SidePanelTab>(activeSidePanelTab);
  const [isHistoryVisible, setIsHistoryVisible] = useState(() => localStorage.getItem(HISTORY_PANEL_VISIBLE_KEY) !== "false");
  const [historyPanelWidth, setHistoryPanelWidth] = useState(() => {
    const storedWidth = Number(localStorage.getItem(HISTORY_PANEL_WIDTH_KEY));
    return Number.isFinite(storedWidth) ? Math.min(Math.max(storedWidth, minHistoryPanelWidth), maxHistoryPanelWidth) : 340;
  });
  const sortedPlaylistItems = useMemo(() => sortPlaylistItems(playlistItems, playlistSortMode, playlistSortDirection), [playlistItems, playlistSortDirection, playlistSortMode]);
  const currentPlaylistIndex = currentSourceId ? sortedPlaylistItems.findIndex((item) => item.id === currentSourceId) : -1;
  const canGoPrevious = currentPlaylistIndex > 0;
  const canGoNext = sortedPlaylistItems.length > 0 && currentPlaylistIndex >= 0 && currentPlaylistIndex < sortedPlaylistItems.length - 1;
  const displayFileName = fileName || t("app.noSelection");

  const currentSettings = (): HistorySettings => ({
    projectionMode,
    previewEye,
    flipX,
    flipY
  });

  const newVideoSettings = (source: Pick<VideoSource, "name" | "path" | "url">): HistorySettings => ({
    projectionMode: detectProjectionModeFromName(source.name, source.path, source.url).mode,
    previewEye: "left",
    flipX: true,
    flipY
  });

  const changeSidePanelTab = (tab: SidePanelTab) => {
    activeSidePanelTabRef.current = tab;
    setActiveSidePanelTab(tab);
  };

  const openExternalUrl = (url: string) => {
    const encodedUrl = encodeURI(url);
    if (window.vr180?.openExternal) {
      void window.vr180.openExternal(encodedUrl);
      return;
    }
    window.open(encodedUrl, "_blank", "noopener,noreferrer");
  };

  const openVideoSource = (
    source: VideoSource,
    settings: HistorySettings = currentSettings(),
    autoPlay = false,
    options: { detectProjectionFromVideoSize?: boolean; seekTimeSeconds?: number; bookmarkId?: string; playAfterSeek?: boolean } = {}
  ) => {
    if (objectUrlRef.current && objectUrlRef.current !== source.url) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    setProjectionMode(settings.projectionMode);
    setPreviewEye(settings.previewEye);
    setFlipX(settings.flipX);
    setFlipY(settings.flipY);
    setVideoUrl(source.url);
    const sourceId = getSourceId(source);
    setCurrentSourceId(sourceId);
    pendingProjectionDetectionRef.current = options.detectProjectionFromVideoSize ? { sourceId } : null;
    pendingSeekRef.current = typeof options.seekTimeSeconds === "number" ? Math.max(options.seekTimeSeconds, 0) : null;
    pendingPlayAfterSeekRef.current = Boolean(options.playAfterSeek);
    currentBookmarkOpenRef.current = options.bookmarkId ?? null;
    setCurrentPath(source.path ?? null);
    setCurrentSourceName(source.name);
    setFileName(getFileAlias(aliases, { id: sourceId, ...source })?.displayName ?? source.name);
    setCurrentTime(pendingSeekRef.current ?? 0);
    setIsPlaying(false);
    pendingAutoPlayRef.current = autoPlay;

    if (source.remember) {
      setHistoryItems(
        upsertHistoryItem({
          path: source.path,
          url: source.url,
          name: source.name,
          ...settings
        })
      );

      const thumbnailKey = source.path ?? source.url;
      if (thumbnailKey) {
        void createVideoThumbnail(source.url, {
          projectionMode: settings.projectionMode,
          previewEye: settings.previewEye
        })
          .then((thumbnailDataUrl) => setHistoryItems(attachThumbnail(thumbnailKey, thumbnailDataUrl)))
          .catch(() => undefined);
      }
    }
  };

  const openNewVideoSource = (source: VideoSource) => {
    const detectedProjection = detectProjectionModeFromName(source.name, source.path, source.url);
    openVideoSource(
      source,
      {
        ...newVideoSettings(source),
        projectionMode: detectedProjection.mode
      },
      true,
      {
        detectProjectionFromVideoSize: detectedProjection.needsVideoSizeLayout
      }
    );
  };

  const openVideo = async () => {
    if (!window.vr180) {
      window.alert(t("alert.electronApiMissing"));
      fileInputRef.current?.click();
      return;
    }

    const result = await window.vr180.openVideo(language).catch(() => null);
    if (!result) {
      return;
    }

    openNewVideoSource({ ...result, remember: true });
  };

  const openBrowserFile = (file: File | undefined) => {
    if (!file) {
      return;
    }

    const filePath = window.vr180?.getPathForFile(file) || (file as File & { path?: string }).path;
    if (filePath) {
      void window.vr180?.openVideoPath(filePath).then((result) => {
        if (result) {
          openNewVideoSource({ ...result, remember: true });
        }
      });
      return;
    }

    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    openNewVideoSource({ url, name: file.name, remember: false });
  };

  const addPlaylistVideos = async () => {
    if (!window.vr180?.openPlaylistVideos) {
      window.alert(t("alert.playlistApiMissing"));
      return;
    }

    const result = await window.vr180.openPlaylistVideos(language).catch(() => null);
    if (!result || result.length === 0) {
      return;
    }

    setPlaylistItems(addPlaylistItems(result.map((video) => ({ ...video, folderPath: video.path ? video.path.split("/").slice(0, -1).join("/") : "" }))));
    changeSidePanelTab("playlist");
    setIsHistoryVisible(true);
  };

  const openHistoryItem = async (item: HistoryItem) => {
    const settings = {
      projectionMode: item.projectionMode,
      previewEye: item.previewEye,
      flipX: item.flipX,
      flipY: item.flipY
    };
    const candidates = [item.path, item.url, item.id].filter((value): value is string => Boolean(value && !value.startsWith("blob:")));
    const attempts: string[] = [
      `electron api: ${window.vr180 ? "ok" : "missing"}`,
      `recover api: ${window.vr180?.recoverVideoByName ? "ok" : "missing"}`
    ];

    for (const candidate of candidates) {
      try {
        const result = await window.vr180?.openVideoPath(candidate);
        attempts.push(`try: ${candidate}\n=> ${result?.path || result?.url || "no result"}`);
        if (result?.url) {
          setHistoryDiagnostics((current) => ({
            ...current,
            [item.id]: [`OK`, ...attempts].join("\n")
          }));
          openVideoSource(
            { ...result, remember: true },
            settings,
            true
          );
          return;
        }
      } catch (error) {
        attempts.push(`try: ${candidate}\n=> error: ${String(error)}`);
      }
    }

    if (window.vr180 && item.name) {
      try {
        attempts.push(`recover by name: ${item.name}`);
        const result = await window.vr180.recoverVideoByName(item.name);
        attempts.push(`=> ${result?.path || result?.url || "not found"}`);
        if (result?.url) {
          setHistoryDiagnostics((current) => ({
            ...current,
            [item.id]: [`RECOVERED`, ...attempts].join("\n")
          }));
          setHistoryItems(deleteHistoryItem(item.id));
          openVideoSource(
            { ...result, remember: true },
            settings,
            true
          );
          return;
        }
      } catch (error) {
        attempts.push(`recover error: ${String(error)}`);
      }
    }

    if (!item.url.startsWith("blob:")) {
      setHistoryDiagnostics((current) => ({
        ...current,
        [item.id]: [`fallback direct`, ...attempts, `url: ${item.url}`, `path: ${item.path ?? ""}`].join("\n")
      }));
      openVideoSource(
        { path: item.path, url: item.url, name: item.name, remember: true },
        settings,
        true
      );
      return;
    }

    setHistoryDiagnostics((current) => ({
      ...current,
      [item.id]: [`blob URL expired`, ...attempts].join("\n")
    }));
    setHistoryItems(markHistoryMissing(item.path || item.id));
  };

  const markCurrentVideoError = () => {
    const video = videoRef.current;
    const message = `video error: code=${video?.error?.code ?? "unknown"} src=${videoUrl ?? ""} path=${currentPath ?? ""}`;
    if (currentSourceId) {
      setHistoryDiagnostics((current) => ({
        ...current,
        [currentSourceId]: message
      }));
      setHistoryItems(markHistoryMissing(currentPath || currentSourceId));
      setPlaylistItems(markPlaylistMissing(currentSourceId));
    }
    if (currentBookmarkOpenRef.current) {
      setBookmarks(markBookmarkMissing(currentBookmarkOpenRef.current));
    }
  };

  const openPlaylistItem = async (item: PlaylistItem) => {
    const candidates = [item.path, item.url, item.id].filter((value): value is string => Boolean(value && !value.startsWith("blob:")));
    const playlistSettings = item.projectionMode && item.previewEye && typeof item.flipX === "boolean" && typeof item.flipY === "boolean"
      ? {
          projectionMode: item.projectionMode,
          previewEye: item.previewEye,
          flipX: item.flipX,
          flipY: item.flipY
        }
      : null;
    const openPlaylistSource = (source: VideoSource) => {
      if (playlistSettings) {
        openVideoSource(source, playlistSettings, true);
        return;
      }
      openNewVideoSource(source);
    };

    for (const candidate of candidates) {
      try {
        const result = await window.vr180?.openVideoPath(candidate);
        if (result?.url) {
          openPlaylistSource({ ...result, remember: true });
          return;
        }
      } catch {
        // Try the next candidate.
      }
    }

    if (!item.url.startsWith("blob:")) {
      openPlaylistSource({ path: item.path, url: item.url, name: item.name, remember: true });
      return;
    }

    setPlaylistItems(markPlaylistMissing(item.id));
  };

  const createPlaylistThumbnailForCurrentVideo = (sourceId: string, sourceUrl: string) => {
    if (playlistItems.some((item) => item.id === sourceId && item.thumbnailDataUrl)) {
      return;
    }

    const existingHistoryThumbnail = historyItems.find((item) => item.id === sourceId)?.thumbnailDataUrl;
    if (existingHistoryThumbnail) {
      setPlaylistItems(attachPlaylistThumbnail(sourceId, existingHistoryThumbnail));
      return;
    }

    void createVideoThumbnail(sourceUrl, {
      projectionMode,
      previewEye
    })
      .then((thumbnailDataUrl) => setPlaylistItems(attachPlaylistThumbnail(sourceId, thumbnailDataUrl)))
      .catch(() => undefined);
  };

  const openPlaylistByOffset = (offset: number, revealPanel = false) => {
    if (sortedPlaylistItems.length === 0) {
      return;
    }

    const currentIndex = currentSourceId ? sortedPlaylistItems.findIndex((item) => item.id === currentSourceId) : -1;
    const nextIndex = currentIndex >= 0 ? currentIndex + offset : -1;
    if (nextIndex < 0 || nextIndex >= sortedPlaylistItems.length) {
      return;
    }

    if (revealPanel) {
      changeSidePanelTab("playlist");
      setIsHistoryVisible(true);
    }
    void openPlaylistItem(sortedPlaylistItems[nextIndex]);
  };

  const openAdjacentVideo = (offset: number) => {
    openPlaylistByOffset(offset, true);
  };

  const handleVideoEnded = () => {
    if (currentPlaylistIndex < 0) {
      return;
    }

    openPlaylistByOffset(1);
  };

  const renameHistoryItem = (item: HistoryItem, displayName: string) => {
    const nextAliases = setFileAliasForSource(item, displayName);
    setAliases(nextAliases);
    if (currentSourceId === item.id) {
      setFileName(getFileAlias(nextAliases, item)?.displayName ?? item.name);
    }
    setRenamingHistoryItem(null);
  };

  const removeHistoryItem = (item: HistoryItem) => {
    const confirmed = window.confirm(t("confirm.deleteHistory", { name: getFileAlias(aliases, item)?.displayName ?? item.name }));
    if (!confirmed) {
      return;
    }

    setHistoryItems(deleteHistoryItem(item.id));
  };

  const removeAllHistoryItems = () => {
    if (historyItems.length === 0) {
      return;
    }

    const confirmed = window.confirm(t("confirm.clearHistory"));
    if (!confirmed) {
      return;
    }

    setHistoryItems(clearHistory());
    setHistoryDiagnostics({});
  };

  const addCurrentBookmark = () => {
    const video = videoRef.current;
    if (!video || !videoUrl || !currentSourceId) {
      return;
    }

    const bookmarkTime = Number.isFinite(video.currentTime) ? video.currentTime : currentTime;
    const displayName = t("bookmark.defaultName", { time: formatBookmarkTime(bookmarkTime) });
    const source = {
      path: currentPath ?? undefined,
      url: videoUrl,
      name: currentSourceName
    };
    const { items, bookmark } = addBookmark({
      ...source,
      timeSeconds: bookmarkTime,
      displayName,
      ...currentSettings()
    });
    setBookmarks(items);
    changeSidePanelTab("bookmarks");

    void createVideoThumbnail(videoUrl, {
      projectionMode,
      previewEye,
      seekSeconds: bookmarkTime
    })
      .then((thumbnailDataUrl) => setBookmarks(attachBookmarkThumbnail(bookmark.id, thumbnailDataUrl)))
      .catch(() => undefined);
  };

  const openBookmarkItem = async (item: BookmarkItem) => {
    const settings = {
      projectionMode: item.projectionMode,
      previewEye: item.previewEye,
      flipX: item.flipX,
      flipY: item.flipY
    };

    if (item.sourceId === currentSourceId && videoRef.current) {
      const video = videoRef.current;
      const targetTime = Number.isFinite(video.duration) && video.duration > 0
        ? Math.min(Math.max(item.timeSeconds, 0), Math.max(video.duration - 0.1, 0))
        : Math.max(item.timeSeconds, 0);
      pendingAutoPlayRef.current = false;
      pendingSeekRef.current = null;
      pendingPlayAfterSeekRef.current = false;
      currentBookmarkOpenRef.current = item.id;
      setProjectionMode(settings.projectionMode);
      setPreviewEye(settings.previewEye);
      setFlipX(settings.flipX);
      setFlipY(settings.flipY);
      video.currentTime = targetTime;
      setCurrentTime(targetTime);
      void video.play().catch(() => undefined);
      return;
    }

    const candidates = [item.path, item.url, item.sourceId].filter((value): value is string => Boolean(value && !value.startsWith("blob:")));

    for (const candidate of candidates) {
      try {
        const result = await window.vr180?.openVideoPath(candidate);
        if (result?.url) {
          openVideoSource(
            { ...result, remember: true },
            settings,
            false,
            { seekTimeSeconds: item.timeSeconds, bookmarkId: item.id, playAfterSeek: true }
          );
          return;
        }
      } catch {
        // Try the next recovery candidate.
      }
    }

    if (window.vr180 && item.name) {
      try {
        const result = await window.vr180.recoverVideoByName(item.name);
        if (result?.url) {
          openVideoSource(
            { ...result, remember: true },
            settings,
            false,
            { seekTimeSeconds: item.timeSeconds, bookmarkId: item.id, playAfterSeek: true }
          );
          return;
        }
      } catch {
        // Fall through to direct URL fallback.
      }
    }

    if (!item.url.startsWith("blob:")) {
      openVideoSource(
        { path: item.path, url: item.url, name: item.name, remember: true },
        settings,
        false,
        { seekTimeSeconds: item.timeSeconds, bookmarkId: item.id, playAfterSeek: true }
      );
      return;
    }

    setBookmarks(markBookmarkMissing(item.id));
  };

  const renameBookmarkItem = (item: BookmarkItem, displayName: string) => {
    setBookmarks(updateBookmarkName(item.id, displayName));
    setRenamingBookmarkItem(null);
  };

  const removeBookmarkItem = (item: BookmarkItem) => {
    const confirmed = window.confirm(t("confirm.deleteBookmark", { name: item.displayName }));
    if (!confirmed) {
      return;
    }

    setBookmarks(deleteBookmark(item.id));
  };

  const removeAllBookmarkItems = () => {
    if (bookmarks.length === 0) {
      return;
    }

    const confirmed = window.confirm(t("confirm.clearBookmarks"));
    if (!confirmed) {
      return;
    }

    setBookmarks(clearBookmarks());
  };

  const removeAllPlaylistItems = () => {
    if (playlistItems.length === 0) {
      return;
    }

    const confirmed = window.confirm(t("confirm.clearPlaylist"));
    if (!confirmed) {
      return;
    }

    setPlaylistItems(clearPlaylist());
  };

  const removePlaylistItem = (item: PlaylistItem) => {
    const confirmed = window.confirm(t("confirm.deletePlaylist", { name: getFileAlias(aliases, item)?.displayName ?? item.name }));
    if (!confirmed) {
      return;
    }

    setPlaylistItems(deletePlaylistItem(item.id));
  };

  const changePlaylistSortMode = (sortMode: PlaylistSortMode) => {
    setPlaylistSortMode(sortMode);
    localStorage.setItem(PLAYLIST_SORT_KEY, sortMode);
  };

  const changePlaylistSortDirection = (sortDirection: PlaylistSortDirection) => {
    setPlaylistSortDirection(sortDirection);
    localStorage.setItem(PLAYLIST_SORT_DIRECTION_KEY, sortDirection);
  };

  const reorderPlaylist = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) {
      return;
    }

    const orderedIds = sortedPlaylistItems.map((item) => item.id);
    const draggedIndex = orderedIds.indexOf(draggedId);
    const targetIndex = orderedIds.indexOf(targetId);
    if (draggedIndex < 0 || targetIndex < 0) {
      return;
    }

    orderedIds.splice(draggedIndex, 1);
    orderedIds.splice(targetIndex, 0, draggedId);
    setPlaylistItems(reorderPlaylistItems(orderedIds));
    changePlaylistSortMode("manual");
    changePlaylistSortDirection("asc");
  };

  const exportAliasCsv = () => {
    const csv = buildAliasCsv(historyItems, aliases);
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vr-smb-player-aliases.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportPlaylistCsv = () => {
    const csv = buildPlaylistCsv(playlistItems, historyItems, aliases);
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `df-vr-player-playlist-${APP_VERSION}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const importPlaylistCsvFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    try {
      const result = importPlaylistCsv(await file.text());
      setPlaylistItems(result.items);
      setAliases(result.aliases);
      changePlaylistSortMode("manual");
      changePlaylistSortDirection("asc");
      changeSidePanelTab("playlist");
      setIsHistoryVisible(true);
      window.alert(t("alert.playlistImportSuccess", { addedCount: result.addedCount, skippedCount: result.skippedCount }));
    } catch (error) {
      window.alert(t("alert.playlistImportError", { error: String(error) }));
    } finally {
      if (playlistCsvInputRef.current) {
        playlistCsvInputRef.current.value = "";
      }
    }
  };

  const renameAliasRow = (row: AliasManagerRow, displayName: string) => {
    const nextAliases = updateAliasKeys(row.keys, displayName);
    setAliases(nextAliases);
    if (currentSourceId) {
      setFileName(getFileAlias(nextAliases, { id: currentSourceId, path: currentPath ?? undefined, url: videoUrl ?? "", name: fileName })?.displayName ?? fileName);
    }
  };

  const deleteAliasRow = (row: AliasManagerRow) => {
    const confirmed = window.confirm(t("confirm.deleteAlias", { name: row.displayName }));
    if (!confirmed) {
      return;
    }

    const nextAliases = deleteAliasKeys(row.keys);
    setAliases(nextAliases);
    if (currentSourceId) {
      const currentHistoryItem = historyItems.find((item) => item.id === currentSourceId);
      setFileName(currentHistoryItem ? getFileAlias(nextAliases, currentHistoryItem)?.displayName ?? currentHistoryItem.name : fileName);
    }
  };

  const startHistoryResize = (event: React.PointerEvent<HTMLDivElement>) => {
    dragStartRef.current = {
      startX: event.clientX,
      startWidth: historyPanelWidth
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const resizeHistoryPanel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) {
      return;
    }

    const delta = dragStartRef.current.startX - event.clientX;
    setHistoryPanelWidth(Math.min(Math.max(dragStartRef.current.startWidth + delta, minHistoryPanelWidth), maxHistoryPanelWidth));
  };

  const stopHistoryResize = (event: React.PointerEvent<HTMLDivElement>) => {
    dragStartRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video || !videoUrl) {
      await openVideo();
      return;
    }

    if (video.paused) {
      await video.play();
    } else {
      video.pause();
    }
  };

  const seek = (time: number) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.currentTime = time;
    setCurrentTime(time);
  };

  const changeVolume = (nextVolume: number) => {
    const clamped = Math.min(Math.max(nextVolume, 0), 1);
    setVolume(clamped);
    if (clamped > 0) {
      setIsMuted(false);
    }
    if (videoRef.current) {
      videoRef.current.volume = clamped;
      if (clamped > 0) {
        videoRef.current.muted = false;
      }
    }
  };

  const toggleMute = () => {
    setIsMuted((value) => {
      const nextValue = !value;
      if (videoRef.current) {
        videoRef.current.muted = nextValue;
      }
      return nextValue;
    });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) {
        return;
      }

      const video = videoRef.current;

      if (event.code === "Space") {
        event.preventDefault();
        void togglePlay();
      }

      if (!video) {
        return;
      }

      if (event.key === "ArrowLeft") {
        seek(Math.max(video.currentTime - 5, 0));
      }

      if (event.key === "ArrowRight") {
        seek(Math.min(video.currentTime + 5, video.duration || video.currentTime + 5));
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        changeVolume(volume + 0.05);
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        changeVolume(volume - 0.05);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [volume, videoUrl]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
    localStorage.setItem(VOLUME_KEY, String(volume));
    localStorage.setItem(MUTED_KEY, String(isMuted));
  }, [isMuted, videoUrl, volume]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
    localStorage.setItem(PLAYBACK_RATE_KEY, String(playbackRate));
  }, [playbackRate, videoUrl]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!currentPath) {
      return;
    }

    setHistoryItems(
      updateHistorySettings(currentPath, {
        projectionMode,
        previewEye,
        flipX,
        flipY
      })
    );
    if (currentSourceId && playlistItems.some((item) => item.id === currentSourceId)) {
      setPlaylistItems(
        updatePlaylistSettings(currentSourceId, {
          projectionMode,
          previewEye,
          flipX,
          flipY
        })
      );
    }
  }, [currentPath, flipX, flipY, previewEye, projectionMode]);

  useEffect(() => {
    localStorage.setItem(HISTORY_PANEL_VISIBLE_KEY, String(isHistoryVisible));
  }, [isHistoryVisible]);

  useEffect(() => {
    localStorage.setItem(HISTORY_PANEL_WIDTH_KEY, String(historyPanelWidth));
  }, [historyPanelWidth]);

  useEffect(() => {
    let isCancelled = false;

    const checkRelease = async () => {
      try {
        const release = window.vr180?.checkRelease
          ? await window.vr180.checkRelease()
          : await fetch(LATEST_RELEASE_URL).then((response) => response.json());
        if (!isReleaseInfo(release) || compareVersions(release.version, APP_VERSION) <= 0) {
          return;
        }
        if (localStorage.getItem(DISMISSED_RELEASE_TAG_KEY) === release.tag) {
          return;
        }
        if (!isCancelled) {
          setAvailableRelease(release);
        }
      } catch {
        // Update checks should never interrupt playback or app startup.
      }
    };

    void checkRelease();
    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let dragDepth = 0;

    const hasVideoFile = (event: DragEvent) => Array.from(event.dataTransfer?.items ?? []).some((item) => item.kind === "file");

    const onDragEnter = (event: DragEvent) => {
      if (!hasVideoFile(event)) {
        return;
      }

      event.preventDefault();
      dragDepth += 1;
      setIsDraggingVideo(true);
    };

    const onDragOver = (event: DragEvent) => {
      if (!hasVideoFile(event)) {
        return;
      }

      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }
    };

    const onDragLeave = (event: DragEvent) => {
      if (!hasVideoFile(event)) {
        return;
      }

      dragDepth = Math.max(dragDepth - 1, 0);
      if (dragDepth === 0) {
        setIsDraggingVideo(false);
      }
    };

    const onDrop = (event: DragEvent) => {
      event.preventDefault();
      dragDepth = 0;
      setIsDraggingVideo(false);

      const file = Array.from(event.dataTransfer?.files ?? []).find(isVideoFile);
      if (!file) {
        return;
      }

      const droppedPath = window.vr180?.getPathForFile(file) || (file as File & { path?: string }).path;
      if (droppedPath) {
        void window.vr180?.openVideoPath(droppedPath).then((result) => {
          if (result) {
            openNewVideoSource({ ...result, remember: true });
          }
        });
        return;
      }

      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      openNewVideoSource({ url, name: file.name, remember: false });
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [flipX, flipY, previewEye, projectionMode]);

  return (
    <div className="app">
      <input
        ref={fileInputRef}
        className="file-input"
        accept=".mp4,.mov,.m4v,.webm,video/mp4,video/quicktime,video/webm"
        type="file"
        onChange={(event) => openBrowserFile(event.currentTarget.files?.[0])}
      />
      <input
        ref={playlistCsvInputRef}
        className="file-input"
        accept=".csv,text/csv"
        type="file"
        onChange={(event) => void importPlaylistCsvFile(event.currentTarget.files?.[0])}
      />
      <div
        className={`app-main ${isHistoryVisible ? "" : "is-history-hidden"}`}
        style={{ "--history-panel-width": `${historyPanelWidth}px` } as React.CSSProperties}
      >
        <section className="workspace">
          <header className="top-bar">
            <div>
              <p className="eyebrow">DF VR Player · {APP_BUILD}</p>
              <h1>{displayFileName}</h1>
            </div>
            <div className="top-actions">
              <ProjectionModeSelector value={projectionMode} onChange={setProjectionMode} />
              <button aria-label={t("settings.title")} className="top-icon-button" type="button" title={t("settings.title")} onClick={() => setIsSettingsOpen(true)}>
                <Settings size={18} strokeWidth={2.2} />
              </button>
              <button
                aria-label={t("app.sidePanel")}
                className={`top-icon-button ${isHistoryVisible ? "is-active" : ""}`}
                data-tooltip={t("app.sidePanel")}
                title={t("app.sidePanel")}
                type="button"
                onClick={() => setIsHistoryVisible((value) => !value)}
              >
                {isHistoryVisible ? <PanelRightClose size={18} strokeWidth={2.2} /> : <PanelRightOpen size={18} strokeWidth={2.2} />}
              </button>
            </div>
          </header>
          <PlayerView
            resetSignal={resetSignal}
            videoRef={videoRef}
            videoUrl={videoUrl}
            zoomResetSignal={zoomResetSignal}
            flipX={flipX}
            flipY={flipY}
            previewEye={previewEye}
            projectionMode={projectionMode}
            onLoadedMetadata={() => {
              const video = videoRef.current;
              if (video) {
                video.playbackRate = playbackRate;
              }
              const nextDuration = video?.duration ?? 0;
              setDuration(nextDuration);
              if (currentSourceId && Number.isFinite(nextDuration) && nextDuration > 0) {
                setHistoryItems(updateHistoryDuration(currentSourceId, nextDuration));
                setPlaylistItems(updatePlaylistDuration(currentSourceId, nextDuration));
              }
              if (currentSourceId && videoUrl && playlistItems.some((item) => item.id === currentSourceId)) {
                createPlaylistThumbnailForCurrentVideo(currentSourceId, videoUrl);
              }
              const pendingDetection = pendingProjectionDetectionRef.current;
              if (video && pendingDetection && pendingDetection.sourceId === currentSourceId) {
                pendingProjectionDetectionRef.current = null;
                const detectedMode = detectProjectionModeFromVideoSize(projectionMode, video.videoWidth, video.videoHeight);
                if (detectedMode !== projectionMode) {
                  setProjectionMode(detectedMode);
                  if (currentPath) {
                    setHistoryItems(
                      updateHistorySettings(currentPath, {
                        projectionMode: detectedMode,
                        previewEye,
                        flipX,
                        flipY
                      })
                    );
                  }
                  if (videoUrl) {
                    const thumbnailKey = currentPath ?? videoUrl;
                    void createVideoThumbnail(videoUrl, {
                      projectionMode: detectedMode,
                      previewEye
                    })
                      .then((thumbnailDataUrl) => setHistoryItems(attachThumbnail(thumbnailKey, thumbnailDataUrl)))
                      .catch(() => undefined);
                  }
                }
              }
              if (pendingAutoPlayRef.current) {
                pendingAutoPlayRef.current = false;
                void videoRef.current?.play().catch(() => undefined);
              }
              const pendingSeek = pendingSeekRef.current;
              if (video && pendingSeek !== null) {
                pendingSeekRef.current = null;
                const targetTime = Number.isFinite(video.duration) && video.duration > 0 ? Math.min(pendingSeek, Math.max(video.duration - 0.1, 0)) : pendingSeek;
                video.currentTime = targetTime;
                setCurrentTime(targetTime);
                pendingAutoPlayRef.current = false;
                if (pendingPlayAfterSeekRef.current) {
                  pendingPlayAfterSeekRef.current = false;
                  void video.play().catch(() => undefined);
                } else {
                  video.pause();
                }
              }
            }}
            onPlayStateChange={setIsPlaying}
            onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
            onVideoError={markCurrentVideoError}
            onEnded={handleVideoEnded}
          />
          <ControlBar
            currentTime={currentTime}
            duration={duration}
            flipX={flipX}
            flipY={flipY}
            canAddBookmark={Boolean(videoUrl && currentSourceId)}
            canGoPrevious={canGoPrevious}
            canGoNext={canGoNext}
            isPlaying={isPlaying}
            playbackRate={playbackRate}
            playbackRates={playbackRates}
            previewEye={previewEye}
            isMuted={isMuted}
            volume={volume}
            onOpen={openVideo}
            onAddBookmark={addCurrentBookmark}
            onPrevious={() => openAdjacentVideo(-1)}
            onNext={() => openAdjacentVideo(1)}
            onPreviewEye={setPreviewEye}
            onPlaybackRate={setPlaybackRate}
            onResetView={() => setResetSignal((value) => value + 1)}
            onResetZoom={() => setZoomResetSignal((value) => value + 1)}
            onSeek={seek}
            onToggleFlipX={() => setFlipX((value) => !value)}
            onToggleFlipY={() => setFlipY((value) => !value)}
            onToggleMute={toggleMute}
            onTogglePlay={() => void togglePlay()}
            onVolume={changeVolume}
          />
        </section>
        {isHistoryVisible && (
          <>
            <div
              className="history-resizer"
              role="separator"
              aria-label={t("app.historyPanelWidth")}
              onPointerDown={startHistoryResize}
              onPointerMove={resizeHistoryPanel}
              onPointerUp={stopHistoryResize}
              onPointerCancel={stopHistoryResize}
            />
            <HistoryPanel
              activeId={currentSourceId}
              activeTab={activeSidePanelTab}
              aliases={aliases}
              bookmarks={bookmarks}
              items={historyItems}
              playlistItems={sortedPlaylistItems}
              playlistSortDirection={playlistSortDirection}
              playlistSortMode={playlistSortMode}
              onTabChange={changeSidePanelTab}
              onOpen={(item) => void openHistoryItem(item)}
              onRequestRename={setRenamingHistoryItem}
              onDelete={removeHistoryItem}
              onClear={removeAllHistoryItems}
              onOpenBookmark={(item) => void openBookmarkItem(item)}
              onRequestBookmarkRename={setRenamingBookmarkItem}
              onDeleteBookmark={removeBookmarkItem}
              onClearBookmarks={removeAllBookmarkItems}
              onOpenPlaylistItem={(item) => void openPlaylistItem(item)}
              onDeletePlaylistItem={removePlaylistItem}
              onAddPlaylistVideos={() => void addPlaylistVideos()}
              onExportPlaylistCsv={exportPlaylistCsv}
              onImportPlaylistCsv={() => playlistCsvInputRef.current?.click()}
              onClearPlaylist={removeAllPlaylistItems}
              onPlaylistReorder={reorderPlaylist}
              onPlaylistSortDirection={changePlaylistSortDirection}
              onPlaylistSortMode={changePlaylistSortMode}
              onOpenAliasManager={() => setIsAliasManagerOpen(true)}
            />
          </>
        )}
      </div>
      {isAliasManagerOpen && (
        <AliasManagerModal
          rows={buildAliasManagerRows(historyItems, aliases)}
          onClose={() => setIsAliasManagerOpen(false)}
          onDelete={deleteAliasRow}
          onExportCsv={exportAliasCsv}
          onRename={renameAliasRow}
        />
      )}
      {isSettingsOpen && (
        <SettingsModal
          build={APP_BUILD}
          version={APP_VERSION}
          onClose={() => setIsSettingsOpen(false)}
          onOpenSupport={() => {
            if (window.vr180?.openSupport) {
              void window.vr180.openSupport();
              return;
            }
            window.open(SUPPORT_URL, "_blank", "noopener,noreferrer");
          }}
        />
      )}
      {renamingHistoryItem && (
        <RenameAliasModal
          aliases={aliases}
          item={renamingHistoryItem}
          onClose={() => setRenamingHistoryItem(null)}
          onSave={(displayName) => renameHistoryItem(renamingHistoryItem, displayName)}
        />
      )}
      {renamingBookmarkItem && (
        <RenameBookmarkModal
          item={renamingBookmarkItem}
          onClose={() => setRenamingBookmarkItem(null)}
          onSave={(displayName) => renameBookmarkItem(renamingBookmarkItem, displayName)}
        />
      )}
      {availableRelease && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setAvailableRelease(null)}>
          <section className="update-modal" role="dialog" aria-modal="true" aria-labelledby="update-title" onMouseDown={(event) => event.stopPropagation()}>
            <div>
              <p className="eyebrow">{t("update.available")}</p>
              <h2 id="update-title">{availableRelease.title}</h2>
            </div>
            <ul>
              {availableRelease.changes.slice(0, 5).map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
            <div className="modal-actions">
              <button type="button" onClick={() => openExternalUrl(availableRelease.github_release_url)}>
                GitHub Release
              </button>
              <button type="button" onClick={() => openExternalUrl(availableRelease.download_url)}>
                {t("update.download")}
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem(DISMISSED_RELEASE_TAG_KEY, availableRelease.tag);
                  setAvailableRelease(null);
                }}
              >
                {t("update.dismiss")}
              </button>
            </div>
          </section>
        </div>
      )}
      {isDraggingVideo && (
        <div className="drop-overlay">
          <div>{t("app.dropToOpen")}</div>
        </div>
      )}
    </div>
  );
}
