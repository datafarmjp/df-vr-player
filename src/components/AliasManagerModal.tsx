import { useEffect, useState } from "react";
import { AliasManagerRow } from "../state/historyStore";

type AliasManagerModalProps = {
  rows: AliasManagerRow[];
  onClose: () => void;
  onExportCsv: () => void;
  onRename: (row: AliasManagerRow, displayName: string) => void;
  onDelete: (row: AliasManagerRow) => void;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
};

export function AliasManagerModal({ rows, onClose, onExportCsv, onRename, onDelete }: AliasManagerModalProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const startEditing = (row: AliasManagerRow) => {
    setEditingKey(row.keys.join("\u0000"));
    setDraftName(row.displayName);
  };

  const stopEditing = () => {
    setEditingKey(null);
    setDraftName("");
  };

  const commitEditing = (row: AliasManagerRow) => {
    onRename(row, draftName);
    stopEditing();
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="alias-modal" role="dialog" aria-modal="true" aria-labelledby="alias-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="alias-modal-header">
          <div>
            <h2 id="alias-modal-title">別名管理</h2>
            <p>{rows.length}件の別名を管理します。</p>
          </div>
          <div className="alias-modal-actions">
            <button type="button" onClick={onExportCsv}>
              CSVダウンロード
            </button>
            <button type="button" onClick={onClose}>
              閉じる
            </button>
          </div>
        </header>

        {rows.length === 0 ? (
          <p className="alias-empty">保存済みの別名はありません。</p>
        ) : (
          <div className="alias-table-wrap">
            <table className="alias-table">
              <thead>
                <tr>
                  <th>元ファイル名</th>
                  <th>別名</th>
                  <th>更新日時</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const rowKey = row.keys.join("\u0000");
                  const isEditing = editingKey === rowKey;

                  return (
                    <tr key={rowKey}>
                      <td className="alias-file-name" title={row.fileName}>
                        {row.fileName}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            autoFocus
                            value={draftName}
                            onChange={(event) => setDraftName(event.currentTarget.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                commitEditing(row);
                              }
                              if (event.key === "Escape") {
                                event.preventDefault();
                                stopEditing();
                              }
                            }}
                          />
                        ) : (
                          <span className="alias-display-name">{row.displayName}</span>
                        )}
                      </td>
                      <td className="alias-updated-at">{formatDate(row.updatedAt)}</td>
                      <td>
                        <div className="alias-row-actions">
                          {isEditing ? (
                            <>
                              <button type="button" onClick={() => commitEditing(row)}>
                                保存
                              </button>
                              <button type="button" onClick={stopEditing}>
                                取消
                              </button>
                            </>
                          ) : (
                            <>
                              <button type="button" onClick={() => startEditing(row)}>
                                編集
                              </button>
                              <button type="button" onClick={() => onDelete(row)}>
                                削除
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
