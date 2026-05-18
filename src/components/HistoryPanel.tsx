import { FileAlias, getFileAlias, HISTORY_LIMIT, HistoryItem } from "../state/historyStore";

type HistoryPanelProps = {
  items: HistoryItem[];
  activeId: string | null;
  aliases: Record<string, FileAlias>;
  onOpen: (item: HistoryItem) => void;
  onRequestRename: (item: HistoryItem) => void;
  onDelete: (item: HistoryItem) => void;
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

export function HistoryPanel({
  items,
  activeId,
  aliases,
  onOpen,
  onRequestRename,
  onDelete,
  onOpenAliasManager
}: HistoryPanelProps) {
  return (
    <aside className="history-panel" aria-label="履歴">
      <div className="history-header">
        <h2>履歴</h2>
        <div className="history-header-actions">
          <button type="button" onClick={onOpenAliasManager}>
            別名管理
          </button>
          <span>{items.length}/{HISTORY_LIMIT}</span>
        </div>
      </div>
      {items.length === 0 ? (
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
      )}
    </aside>
  );
}
