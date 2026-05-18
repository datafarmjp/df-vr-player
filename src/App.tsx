import { useEffect, useRef, useState } from "react";
import { AliasManagerModal } from "./components/AliasManagerModal";
import { ControlBar } from "./components/ControlBar";
import { HistoryPanel } from "./components/HistoryPanel";
import { PlayerView } from "./components/PlayerView";
import { ProjectionModeSelector } from "./components/ProjectionModeSelector";
import { RenameAliasModal } from "./components/RenameAliasModal";
import {
  attachThumbnail,
  buildAliasManagerRows,
  buildAliasCsv,
  clearHistory,
  deleteAliasKeys,
  deleteHistoryItem,
  AliasManagerRow,
  FileAlias,
  getFileAlias,
  getSourceId,
  HistoryItem,
  HistorySettings,
  loadAliases,
  loadHistory,
  markHistoryMissing,
  setFileAliasForSource,
  updateAliasKeys,
  updateHistorySettings,
  upsertHistoryItem
} from "./state/historyStore";
import { createVideoThumbnail } from "./vr/createThumbnail";
import { detectProjectionModeFromName, detectProjectionModeFromVideoSize } from "./vr/detectProjectionMode";
import { PreviewEye, ProjectionMode } from "./vr/projectionModes";

type VideoSource = {
  path?: string;
  url: string;
  name: string;
  remember: boolean;
};

const APP_BUILD = "2026-05-18 auto-projection-1";
const videoExtensions = [".mp4", ".mov", ".m4v", ".webm"];
const HISTORY_PANEL_VISIBLE_KEY = "vr-smb-player:history-panel-visible";
const HISTORY_PANEL_WIDTH_KEY = "vr-smb-player:history-panel-width";
const minHistoryPanelWidth = 220;
const maxHistoryPanelWidth = 520;

const isVideoFile = (file: File) => {
  const lowerName = file.name.toLowerCase();
  return videoExtensions.some((extension) => lowerName.endsWith(extension));
};

export function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const pendingAutoPlayRef = useRef(false);
  const pendingProjectionDetectionRef = useRef<{ sourceId: string } | null>(null);
  const dragStartRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [currentSourceId, setCurrentSourceId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("未選択");
  const [projectionMode, setProjectionMode] = useState<ProjectionMode>("vr180-sbs");
  const [previewEye, setPreviewEye] = useState<PreviewEye>("left");
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [resetSignal, setResetSignal] = useState(0);
  const [zoomResetSignal, setZoomResetSignal] = useState(0);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>(() => loadHistory());
  const [aliases, setAliases] = useState<Record<string, FileAlias>>(() => loadAliases());
  const [historyDiagnostics, setHistoryDiagnostics] = useState<Record<string, string>>({});
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const [isAliasManagerOpen, setIsAliasManagerOpen] = useState(false);
  const [renamingHistoryItem, setRenamingHistoryItem] = useState<HistoryItem | null>(null);
  const [isHistoryVisible, setIsHistoryVisible] = useState(() => localStorage.getItem(HISTORY_PANEL_VISIBLE_KEY) !== "false");
  const [historyPanelWidth, setHistoryPanelWidth] = useState(() => {
    const storedWidth = Number(localStorage.getItem(HISTORY_PANEL_WIDTH_KEY));
    return Number.isFinite(storedWidth) ? Math.min(Math.max(storedWidth, minHistoryPanelWidth), maxHistoryPanelWidth) : 260;
  });

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

  const openVideoSource = (
    source: VideoSource,
    settings: HistorySettings = currentSettings(),
    autoPlay = false,
    options: { detectProjectionFromVideoSize?: boolean } = {}
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
    setCurrentPath(source.path ?? null);
    setFileName(getFileAlias(aliases, { id: sourceId, ...source })?.displayName ?? source.name);
    setCurrentTime(0);
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
      false,
      {
        detectProjectionFromVideoSize: detectedProjection.needsVideoSizeLayout
      }
    );
  };

  const openVideo = async () => {
    if (!window.vr180) {
      window.alert("Electron APIを読み込めませんでした。最新版アプリを起動し直してください。");
      fileInputRef.current?.click();
      return;
    }

    const result = await window.vr180.openVideo().catch(() => null);
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
    }
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
    const confirmed = window.confirm(`履歴から削除しますか？\n${getFileAlias(aliases, item)?.displayName ?? item.name}\n\n別名は残ります。`);
    if (!confirmed) {
      return;
    }

    setHistoryItems(deleteHistoryItem(item.id));
  };

  const removeAllHistoryItems = () => {
    if (historyItems.length === 0) {
      return;
    }

    const confirmed = window.confirm(`履歴をすべて削除しますか？\n\n別名は残ります。`);
    if (!confirmed) {
      return;
    }

    setHistoryItems(clearHistory());
    setHistoryDiagnostics({});
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

  const renameAliasRow = (row: AliasManagerRow, displayName: string) => {
    const nextAliases = updateAliasKeys(row.keys, displayName);
    setAliases(nextAliases);
    if (currentSourceId) {
      setFileName(getFileAlias(nextAliases, { id: currentSourceId, path: currentPath ?? undefined, url: videoUrl ?? "", name: fileName })?.displayName ?? fileName);
    }
  };

  const deleteAliasRow = (row: AliasManagerRow) => {
    const confirmed = window.confirm(`別名を削除しますか？\n${row.displayName}\n\n履歴と動画ファイルは削除されません。`);
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
    if (videoRef.current) {
      videoRef.current.volume = clamped;
    }
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
    }
  }, [videoUrl, volume]);

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
  }, [currentPath, flipX, flipY, previewEye, projectionMode]);

  useEffect(() => {
    localStorage.setItem(HISTORY_PANEL_VISIBLE_KEY, String(isHistoryVisible));
  }, [isHistoryVisible]);

  useEffect(() => {
    localStorage.setItem(HISTORY_PANEL_WIDTH_KEY, String(historyPanelWidth));
  }, [historyPanelWidth]);

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
      <div
        className={`app-main ${isHistoryVisible ? "" : "is-history-hidden"}`}
        style={{ "--history-panel-width": `${historyPanelWidth}px` } as React.CSSProperties}
      >
        <section className="workspace">
          <header className="top-bar">
            <div>
              <p className="eyebrow">DF VR Player · {APP_BUILD}</p>
              <h1>{fileName}</h1>
            </div>
            <div className="top-actions">
              <ProjectionModeSelector value={projectionMode} onChange={setProjectionMode} />
              <button className={isHistoryVisible ? "is-active" : ""} type="button" onClick={() => setIsHistoryVisible((value) => !value)}>
                履歴
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
              setDuration(video?.duration ?? 0);
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
            }}
            onPlayStateChange={setIsPlaying}
            onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
            onVideoError={markCurrentVideoError}
          />
          <ControlBar
            currentTime={currentTime}
            duration={duration}
            flipX={flipX}
            flipY={flipY}
            isPlaying={isPlaying}
            previewEye={previewEye}
            volume={volume}
            onOpen={openVideo}
            onPreviewEye={setPreviewEye}
            onResetView={() => setResetSignal((value) => value + 1)}
            onResetZoom={() => setZoomResetSignal((value) => value + 1)}
            onSeek={seek}
            onToggleFlipX={() => setFlipX((value) => !value)}
            onToggleFlipY={() => setFlipY((value) => !value)}
            onTogglePlay={() => void togglePlay()}
            onVolume={changeVolume}
          />
        </section>
        {isHistoryVisible && (
          <>
            <div
              className="history-resizer"
              role="separator"
              aria-label="履歴パネルの幅"
              onPointerDown={startHistoryResize}
              onPointerMove={resizeHistoryPanel}
              onPointerUp={stopHistoryResize}
              onPointerCancel={stopHistoryResize}
            />
            <HistoryPanel
              activeId={currentSourceId}
              aliases={aliases}
              items={historyItems}
              onOpen={(item) => void openHistoryItem(item)}
              onRequestRename={setRenamingHistoryItem}
              onDelete={removeHistoryItem}
              onClear={removeAllHistoryItems}
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
      {renamingHistoryItem && (
        <RenameAliasModal
          aliases={aliases}
          item={renamingHistoryItem}
          onClose={() => setRenamingHistoryItem(null)}
          onSave={(displayName) => renameHistoryItem(renamingHistoryItem, displayName)}
        />
      )}
      {isDraggingVideo && (
        <div className="drop-overlay">
          <div>動画をドロップして開く</div>
        </div>
      )}
    </div>
  );
}
