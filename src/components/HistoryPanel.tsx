import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Bookmark, Download, FilePlus2, History, ListVideo, Pencil, Trash2, Upload, Video } from "lucide-react";
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

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ja-JP", {
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

const playlistSortLabels: Record<PlaylistSortMode, string> = {
  manual: "手動順",
  name: "名前",
  addedAt: "登録日時",
  duration: "再生時間"
};

const panelTabs: { tab: SidePanelTab; label: string; icon: ReactNode }[] = [
  { tab: "history", label: "履歴", icon: <History size={16} strokeWidth={2.2} /> },
  { tab: "bookmarks", label: "ブックマーク", icon: <Bookmark size={16} strokeWidth={2.2} /> },
  { tab: "playlist", label: "プレイリスト", icon: <ListVideo size={16} strokeWidth={2.2} /> }
];

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
  const [draggedPlaylistId, setDraggedPlaylistId] = useState<string | null>(null);
  const visibleBookmarks = activeId ? bookmarks.filter((item) => item.sourceId === activeId) : bookmarks;
  const historyThumbnailById = new Map(items.filter((item) => item.thumbnailDataUrl).map((item) => [item.id, item.thumbnailDataUrl]));

  return (
    <aside className="history-panel" aria-label="履歴">
      <div className="history-header">
        <div className="panel-tabs" role="tablist" aria-label="履歴、ブックマーク、プレイリスト">
          {panelTabs.map((item) => (
            <button
              key={item.tab}
              aria-label={item.label}
              className={activeTab === item.tab ? "is-selected" : ""}
              data-tooltip={item.label}
              title={item.label}
              type="button"
              role="tab"
              onClick={() => onTabChange(item.tab)}
            >
              {item.icon}
            </button>
          ))}
        </div>
        {activeTab === "history" ? (
          <div className="history-header-actions">
            <button type="button" onClick={onOpenAliasManager}>
              別名管理
            </button>
            <button className="history-clear-button" type="button" onClick={onClear} disabled={items.length === 0} title="履歴を一括削除">
              全削除
            </button>
            <span>{items.length}/{HISTORY_LIMIT}</span>
          </div>
        ) : activeTab === "bookmarks" ? (
          <div className="history-header-actions">
            <button className="history-clear-button" type="button" onClick={onClearBookmarks} disabled={bookmarks.length === 0} title="ブックマークを一括削除">
              全削除
            </button>
            <span>{activeId ? `${visibleBookmarks.length}/${BOOKMARK_LIMIT_PER_VIDEO}` : `${visibleBookmarks.length}件`}</span>
          </div>
        ) : (
          <div className="history-header-actions playlist-header-actions">
            <button type="button" onClick={onAddPlaylistVideos} title="動画を追加" data-tooltip="動画を追加" aria-label="動画を追加">
              <FilePlus2 size={15} strokeWidth={2.2} />
              <span>追加</span>
            </button>
            <button type="button" onClick={onImportPlaylistCsv} title="CSV読込" data-tooltip="CSV読込" aria-label="CSV読込">
              <Upload size={15} strokeWidth={2.2} />
            </button>
            <button type="button" onClick={onExportPlaylistCsv} title="CSV保存" data-tooltip="CSV保存" aria-label="CSV保存" disabled={playlistItems.length === 0}>
              <Download size={15} strokeWidth={2.2} />
            </button>
            <label>
              <span>ソート</span>
              <select value={playlistSortMode} onChange={(event) => onPlaylistSortMode(event.currentTarget.value as PlaylistSortMode)}>
                {(Object.keys(playlistSortLabels) as PlaylistSortMode[]).map((sortMode) => (
                  <option key={sortMode} value={sortMode}>
                    {playlistSortLabels[sortMode]}
                  </option>
                ))}
              </select>
            </label>
            <button
              aria-label={playlistSortDirection === "asc" ? "昇順" : "降順"}
              data-tooltip={playlistSortDirection === "asc" ? "昇順" : "降順"}
              title={playlistSortDirection === "asc" ? "昇順" : "降順"}
              type="button"
              onClick={() => onPlaylistSortDirection(playlistSortDirection === "asc" ? "desc" : "asc")}
            >
              {playlistSortDirection === "asc" ? <ArrowUp size={15} strokeWidth={2.2} /> : <ArrowDown size={15} strokeWidth={2.2} />}
            </button>
            <button className="history-clear-button" type="button" onClick={onClearPlaylist} disabled={playlistItems.length === 0} title="プレイリストを一括削除">
              全削除
            </button>
            <span>{playlistItems.length}件</span>
          </div>
        )}
      </div>
      {activeTab === "history" && (
        items.length === 0 ? (
          <p className="history-empty">開いた動画がここに残ります。</p>
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
                        ? "見つかりません"
                        : `${Number.isFinite(item.durationSeconds) ? `長さ ${formatDuration(item.durationSeconds)} · ` : ""}再生 ${formatDate(item.lastOpenedAt)}`}
                    </span>
                  </span>
                </button>
                <div className="history-actions">
                  <button aria-label="名前を編集" data-tooltip="名前を編集" type="button" onClick={() => onRequestRename(item)}>
                    <Pencil size={15} strokeWidth={2.2} />
                  </button>
                  <button aria-label="履歴から削除" data-tooltip="削除" type="button" onClick={() => onDelete(item)}>
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
          <p className="history-empty">{activeId ? "この動画のブックマークはまだありません。" : "ブックマークがここに残ります。"}</p>
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
                    <span className="history-subline">{item.missing ? "見つかりません" : `位置 ${formatTime(item.timeSeconds)}`}</span>
                  </span>
                </button>
                <div className="history-actions">
                  <button aria-label="ブックマーク名を編集" data-tooltip="名前を編集" type="button" onClick={() => onRequestBookmarkRename(item)}>
                    <Pencil size={15} strokeWidth={2.2} />
                  </button>
                  <button aria-label="ブックマークを削除" data-tooltip="削除" type="button" onClick={() => onDeleteBookmark(item)}>
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
          <p className="history-empty">動画を追加するとここに並びます。</p>
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
                    <span className="history-subline">{item.missing ? "見つかりません" : `長さ ${formatDuration(item.durationSeconds)} · 追加 ${formatDate(item.addedAt)}`}</span>
                  </span>
                </button>
                <div className="history-actions">
                  <button aria-label="プレイリストから削除" data-tooltip="削除" type="button" onClick={() => onDeletePlaylistItem(item)}>
                    <Trash2 size={15} strokeWidth={2.2} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </aside>
  );
}
