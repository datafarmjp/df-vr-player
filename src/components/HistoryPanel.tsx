import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Bookmark, Download, FilePlus2, History, ListVideo, Pencil, Trash2, Upload, Video } from "lucide-react";
import { useI18n } from "../i18n";
import {
  BookmarkItem,
  BOOKMARK_LIMIT_PER_VIDEO,
  FileAlias,
  getFileAlias,
  HISTORY_LIMIT,
  HistoryItem,
  PlaylistItem,
  PlaylistSortDirection,
  PlaylistSortMode
} from "../state/historyStore";

export type SidePanelTab = "history" | "bookmarks" | "playlist";

type HistoryPanelProps = {
  items: HistoryItem[];
  bookmarks: BookmarkItem[];
  playlistItems: PlaylistItem[];
  playlistSortDirection: PlaylistSortDirection;
  playlistSortMode: PlaylistSortMode;
  activeId: string | null;
  activeTab: SidePanelTab;
  aliases: Record<string, FileAlias>;
  onTabChange: (tab: SidePanelTab) => void;
  onOpen: (item: HistoryItem) => void;
  onRequestRename: (item: HistoryItem) => void;
  onDelete: (item: HistoryItem) => void;
  onClear: () => void;
  onOpenBookmark: (item: BookmarkItem) => void;
  onRequestBookmarkRename: (item: BookmarkItem) => void;
  onDeleteBookmark: (item: BookmarkItem) => void;
  onClearBookmarks: () => void;
  onOpenPlaylistItem: (item: PlaylistItem) => void;
  onDeletePlaylistItem: (item: PlaylistItem) => void;
  onAddPlaylistVideos: () => void;
  onExportPlaylistCsv: () => void;
  onImportPlaylistCsv: () => void;
  onClearPlaylist: () => void;
  onPlaylistReorder: (draggedId: string, targetId: string) => void;
  onPlaylistSortDirection: (sortDirection: PlaylistSortDirection) => void;
  onPlaylistSortMode: (sortMode: PlaylistSortMode) => void;
  onOpenAliasManager: () => void;
};

const formatDate = (value: string, locale: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
};

const formatTime = (value: number) => {
  if (!Number.isFinite(value)) {
    return "0:00";
  }

  const totalSeconds = Math.max(0, Math.floor(value));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const formatDuration = (value?: number) => {
  if (!Number.isFinite(value)) {
    return "--:--";
  }
  return formatTime(value ?? 0);
};

const playlistSortLabelKeys: Record<PlaylistSortMode, string> = {
  manual: "panel.sortManual",
  name: "panel.sortName",
  addedAt: "panel.sortAddedAt",
  duration: "panel.sortDuration"
};

const panelTabs: { tab: SidePanelTab; labelKey: string; icon: ReactNode }[] = [
  { tab: "history", labelKey: "panel.history", icon: <History size={16} strokeWidth={2.2} /> },
  { tab: "bookmarks", labelKey: "panel.bookmarks", icon: <Bookmark size={16} strokeWidth={2.2} /> },
  { tab: "playlist", labelKey: "panel.playlist", icon: <ListVideo size={16} strokeWidth={2.2} /> }
];

const formatBadgeCount = (count: number) => (count > 99 ? "99+" : String(count));

export function HistoryPanel({
  items,
  bookmarks,
  playlistItems,
  playlistSortDirection,
  playlistSortMode,
  activeId,
  activeTab,
  aliases,
  onTabChange,
  onOpen,
  onRequestRename,
  onDelete,
  onClear,
  onOpenBookmark,
  onRequestBookmarkRename,
  onDeleteBookmark,
  onClearBookmarks,
  onOpenPlaylistItem,
  onDeletePlaylistItem,
  onAddPlaylistVideos,
  onExportPlaylistCsv,
  onImportPlaylistCsv,
  onClearPlaylist,
  onPlaylistReorder,
  onPlaylistSortDirection,
  onPlaylistSortMode,
  onOpenAliasManager
}: HistoryPanelProps) {
  const { locale, t } = useI18n();
  const [draggedPlaylistId, setDraggedPlaylistId] = useState<string | null>(null);
  const visibleBookmarks = activeId ? bookmarks.filter((item) => item.sourceId === activeId) : bookmarks;
  const historyThumbnailById = new Map(items.filter((item) => item.thumbnailDataUrl).map((item) => [item.id, item.thumbnailDataUrl]));
  const getPanelTabCount = (tab: SidePanelTab) => {
    if (tab === "history") {
      return items.length;
    }
    if (tab === "bookmarks") {
      return visibleBookmarks.length;
    }
    return playlistItems.length;
  };

  return (
    <aside className="history-panel" aria-label={t("panel.aria")}>
      <div className="history-header">
        <div className="panel-tabs" role="tablist" aria-label={t("panel.tabsAria")}>
          {panelTabs.map((item) => {
            const count = getPanelTabCount(item.tab);
            const label = t(item.labelKey);
            const tooltip = t("panel.tabCount", { label, count });
            return (
              <button
                key={item.tab}
                aria-label={tooltip}
                className={activeTab === item.tab ? "is-selected" : ""}
                data-tooltip={tooltip}
                title={tooltip}
                type="button"
                role="tab"
                onClick={() => onTabChange(item.tab)}
              >
                {item.icon}
                <span className="panel-tab-count" aria-hidden="true">
                  {formatBadgeCount(count)}
                </span>
              </button>
            );
          })}
        </div>
        {activeTab === "history" ? (
          <div className="history-header-actions">
            <button type="button" onClick={onOpenAliasManager}>
              {t("panel.aliasManager")}
            </button>
            <button className="history-clear-button" type="button" onClick={onClear} disabled={items.length === 0} title={t("panel.clearHistoryTitle")}>
              {t("panel.clearAll")}
            </button>
            <span>{items.length}/{HISTORY_LIMIT}</span>
          </div>
        ) : activeTab === "bookmarks" ? (
          <div className="history-header-actions">
            <button className="history-clear-button" type="button" onClick={onClearBookmarks} disabled={bookmarks.length === 0} title={t("panel.clearBookmarksTitle")}>
              {t("panel.clearAll")}
            </button>
            <span>{activeId ? `${visibleBookmarks.length}/${BOOKMARK_LIMIT_PER_VIDEO}` : t("common.count", { count: visibleBookmarks.length })}</span>
          </div>
        ) : (
          <div className="history-header-actions playlist-header-actions">
            <button type="button" onClick={onAddPlaylistVideos} title={t("panel.addVideo")} data-tooltip={t("panel.addVideo")} aria-label={t("panel.addVideo")}>
              <FilePlus2 size={15} strokeWidth={2.2} />
              <span>{t("panel.add")}</span>
            </button>
            <button className="history-clear-button" type="button" onClick={onClearPlaylist} disabled={playlistItems.length === 0} title={t("panel.clearPlaylistTitle")}>
              {t("panel.clearAll")}
            </button>
            <span>{t("common.count", { count: playlistItems.length })}</span>
          </div>
        )}
      </div>
      {activeTab === "history" && (
        items.length === 0 ? (
          <p className="history-empty">{t("panel.historyEmpty")}</p>
        ) : (
          <div className="history-list">
            {items.map((item) => (
              <div
                key={item.id}
                className={`history-item ${activeId === item.id ? "is-current" : ""} ${item.missing ? "is-missing" : ""}`}
                title={item.path ?? item.url}
                onContextMenu={(event) => {
                  event.preventDefault();
                  onDelete(item);
                }}
              >
                <button className="history-open" type="button" onClick={() => onOpen(item)}>
                  <span className="history-thumb">
                    {item.thumbnailDataUrl ? <img alt="" src={item.thumbnailDataUrl} /> : <span>{item.name.slice(0, 1).toUpperCase()}</span>}
                  </span>
                  <span className="history-meta">
                    <span className="history-name">{getFileAlias(aliases, item)?.displayName ?? item.name}</span>
                    {getFileAlias(aliases, item) && <span className="history-original">{item.name}</span>}
                    <span className="history-subline">
                      {item.missing
                        ? t("panel.missing")
                        : `${Number.isFinite(item.durationSeconds) ? `${t("panel.length", { duration: formatDuration(item.durationSeconds) })} · ` : ""}${t("panel.playedAt", { date: formatDate(item.lastOpenedAt, locale) })}`}
                    </span>
                  </span>
                </button>
                <div className="history-actions">
                  <button aria-label={t("panel.editName")} data-tooltip={t("panel.editName")} type="button" onClick={() => onRequestRename(item)}>
                    <Pencil size={15} strokeWidth={2.2} />
                  </button>
                  <button aria-label={t("panel.deleteFromHistory")} data-tooltip={t("common.delete")} type="button" onClick={() => onDelete(item)}>
                    <Trash2 size={15} strokeWidth={2.2} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
      {activeTab === "bookmarks" && (
        visibleBookmarks.length === 0 ? (
          <p className="history-empty">{activeId ? t("panel.bookmarksEmptyCurrent") : t("panel.bookmarksEmpty")}</p>
        ) : (
          <div className="history-list">
            {visibleBookmarks.map((item) => (
              <div
                key={item.id}
                className={`history-item ${item.missing ? "is-missing" : ""}`}
                title={item.path ?? item.url}
                onContextMenu={(event) => {
                  event.preventDefault();
                  onDeleteBookmark(item);
                }}
              >
                <button className="history-open" type="button" onClick={() => onOpenBookmark(item)}>
                  <span className="history-thumb">
                    {item.thumbnailDataUrl ? <img alt="" src={item.thumbnailDataUrl} /> : <span>{item.displayName.slice(0, 1).toUpperCase()}</span>}
                  </span>
                  <span className="history-meta">
                    <span className="history-name">{item.displayName}</span>
                    <span className="history-original">{item.name}</span>
                    <span className="history-subline">{item.missing ? t("panel.missing") : t("panel.position", { time: formatTime(item.timeSeconds) })}</span>
                  </span>
                </button>
                <div className="history-actions">
                  <button aria-label={t("panel.editBookmarkName")} data-tooltip={t("panel.editName")} type="button" onClick={() => onRequestBookmarkRename(item)}>
                    <Pencil size={15} strokeWidth={2.2} />
                  </button>
                  <button aria-label={t("panel.deleteBookmark")} data-tooltip={t("common.delete")} type="button" onClick={() => onDeleteBookmark(item)}>
                    <Trash2 size={15} strokeWidth={2.2} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
      {activeTab === "playlist" && (
        playlistItems.length === 0 ? (
          <p className="history-empty">{t("panel.playlistEmpty")}</p>
        ) : (
          <div className="history-list">
            {playlistItems.map((item) => (
              <div
                key={item.id}
                className={`history-item ${activeId === item.id ? "is-current" : ""} ${item.missing ? "is-missing" : ""} ${draggedPlaylistId === item.id ? "is-dragging" : ""}`}
                draggable
                title={item.path ?? item.url}
                onDragStart={(event) => {
                  setDraggedPlaylistId(item.id);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", item.id);
                }}
                onDragOver={(event) => {
                  if (!draggedPlaylistId || draggedPlaylistId === item.id) {
                    return;
                  }
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const draggedId = event.dataTransfer.getData("text/plain") || draggedPlaylistId;
                  if (draggedId) {
                    onPlaylistReorder(draggedId, item.id);
                  }
                  setDraggedPlaylistId(null);
                }}
                onDragEnd={() => setDraggedPlaylistId(null)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  onDeletePlaylistItem(item);
                }}
              >
                <button className="history-open" type="button" onClick={() => onOpenPlaylistItem(item)}>
                  <span className="history-thumb">
                    {item.thumbnailDataUrl || historyThumbnailById.get(item.id)
                      ? <img alt="" src={item.thumbnailDataUrl ?? historyThumbnailById.get(item.id)} />
                      : <Video size={22} strokeWidth={2.1} />}
                  </span>
                  <span className="history-meta">
                    <span className="history-name">{getFileAlias(aliases, item)?.displayName ?? item.name}</span>
                    {getFileAlias(aliases, item) && <span className="history-original">{item.name}</span>}
                    <span className="history-subline">
                      {item.missing
                        ? t("panel.missing")
                        : `${t("panel.length", { duration: formatDuration(item.durationSeconds) })} · ${t("panel.addedAt", { date: formatDate(item.addedAt, locale) })}`}
                    </span>
                  </span>
                </button>
                <div className="history-actions">
                  <button aria-label={t("panel.deleteFromPlaylist")} data-tooltip={t("common.delete")} type="button" onClick={() => onDeletePlaylistItem(item)}>
                    <Trash2 size={15} strokeWidth={2.2} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
      {activeTab === "playlist" && (
        <div className="playlist-footer-actions">
          <div className="playlist-file-actions">
            <button type="button" onClick={onImportPlaylistCsv} title={t("panel.importCsv")} data-tooltip={t("panel.importCsv")} aria-label={t("panel.importCsv")}>
              <Upload size={15} strokeWidth={2.2} />
            </button>
            <button type="button" onClick={onExportPlaylistCsv} title={t("panel.exportCsv")} data-tooltip={t("panel.exportCsv")} aria-label={t("panel.exportCsv")} disabled={playlistItems.length === 0}>
              <Download size={15} strokeWidth={2.2} />
            </button>
          </div>
          <label>
            <span>{t("panel.sort")}</span>
            <select value={playlistSortMode} onChange={(event) => onPlaylistSortMode(event.currentTarget.value as PlaylistSortMode)}>
              {(Object.keys(playlistSortLabelKeys) as PlaylistSortMode[]).map((sortMode) => (
                <option key={sortMode} value={sortMode}>
                  {t(playlistSortLabelKeys[sortMode])}
                </option>
              ))}
            </select>
          </label>
          <button
            aria-label={playlistSortDirection === "asc" ? t("panel.sortAsc") : t("panel.sortDesc")}
            data-tooltip={playlistSortDirection === "asc" ? t("panel.sortAsc") : t("panel.sortDesc")}
            title={playlistSortDirection === "asc" ? t("panel.sortAsc") : t("panel.sortDesc")}
            type="button"
            onClick={() => onPlaylistSortDirection(playlistSortDirection === "asc" ? "desc" : "asc")}
          >
            {playlistSortDirection === "asc" ? <ArrowUp size={15} strokeWidth={2.2} /> : <ArrowDown size={15} strokeWidth={2.2} />}
          </button>
        </div>
      )}
    </aside>
  );
}
