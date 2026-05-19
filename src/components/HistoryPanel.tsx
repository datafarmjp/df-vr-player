import { BookmarkItem, BOOKMARK_LIMIT_PER_VIDEO, FileAlias, getFileAlias, HISTORY_LIMIT, HistoryItem } from "../state/historyStore";

export type SidePanelTab = "history" | "bookmarks";

type HistoryPanelProps = {
  items: HistoryItem[];
  bookmarks: BookmarkItem[];
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

export function HistoryPanel({
  items,
  bookmarks,
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
  onOpenAliasManager
}: HistoryPanelProps) {
  const visibleBookmarks = activeId ? bookmarks.filter((item) => item.sourceId === activeId) : bookmarks;

  return (
    <aside className="history-panel" aria-label="履歴">
      <div className="history-header">
        <div className="panel-tabs" role="tablist" aria-label="履歴とブックマーク">
          <button className={activeTab === "history" ? "is-selected" : ""} type="button" role="tab" onClick={() => onTabChange("history")}>
            履歴
          </button>
          <button className={activeTab === "bookmarks" ? "is-selected" : ""} type="button" role="tab" onClick={() => onTabChange("bookmarks")}>
            ブックマーク
          </button>
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
        ) : (
          <div className="history-header-actions">
            <button className="history-clear-button" type="button" onClick={onClearBookmarks} disabled={bookmarks.length === 0} title="ブックマークを一括削除">
              全削除
            </button>
            <span>{activeId ? `${visibleBookmarks.length}/${BOOKMARK_LIMIT_PER_VIDEO}` : `${visibleBookmarks.length}件`}</span>
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
                    <span className="history-subline">{item.missing ? "見つかりません" : `再生 ${formatDate(item.lastOpenedAt)}`}</span>
                  </span>
                </button>
                <div className="history-actions">
                  <button type="button" onClick={() => onRequestRename(item)}>
                    名前
                  </button>
                  <button type="button" onClick={() => onDelete(item)}>
                    削除
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
                  <button type="button" onClick={() => onRequestBookmarkRename(item)}>
                    名前
                  </button>
                  <button type="button" onClick={() => onDeleteBookmark(item)}>
                    削除
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
