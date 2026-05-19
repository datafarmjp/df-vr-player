import { useEffect, useState } from "react";
import { BookmarkItem } from "../state/historyStore";

type RenameBookmarkModalProps = {
  item: BookmarkItem;
  onClose: () => void;
  onSave: (displayName: string) => void;
};

export function RenameBookmarkModal({ item, onClose, onSave }: RenameBookmarkModalProps) {
  const [draftName, setDraftName] = useState(item.displayName);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const commit = () => {
    onSave(draftName);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="rename-modal" role="dialog" aria-modal="true" aria-labelledby="bookmark-rename-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="rename-modal-header">
          <h2 id="bookmark-rename-modal-title">ブックマーク名を編集</h2>
          <p title={item.name}>{item.name}</p>
        </header>
        <div className="rename-modal-body">
          <input
            autoFocus
            value={draftName}
            onChange={(event) => setDraftName(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commit();
              }
            }}
          />
        </div>
        <footer className="rename-modal-actions">
          <button type="button" onClick={commit}>
            保存
          </button>
          <button type="button" onClick={onClose}>
            取消
          </button>
        </footer>
      </section>
    </div>
  );
}
