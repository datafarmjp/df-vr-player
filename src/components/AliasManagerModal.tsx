import { useEffect, useState } from "react";
import { useI18n } from "../i18n";
import { AliasManagerRow } from "../state/historyStore";

type AliasManagerModalProps = {
  rows: AliasManagerRow[];
  onClose: () => void;
  onExportCsv: () => void;
  onRename: (row: AliasManagerRow, displayName: string) => void;
  onDelete: (row: AliasManagerRow) => void;
};

const formatDate = (value: string, locale: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
};

export function AliasManagerModal({ rows, onClose, onExportCsv, onRename, onDelete }: AliasManagerModalProps) {
  const { locale, t } = useI18n();
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
            <h2 id="alias-modal-title">{t("alias.title")}</h2>
            <p>{t("alias.summary", { count: rows.length })}</p>
          </div>
          <div className="alias-modal-actions">
            <button type="button" onClick={onExportCsv}>
              {t("alias.exportCsv")}
            </button>
            <button type="button" onClick={onClose}>
              {t("common.close")}
            </button>
          </div>
        </header>

        {rows.length === 0 ? (
          <p className="alias-empty">{t("alias.empty")}</p>
        ) : (
          <div className="alias-table-wrap">
            <table className="alias-table">
              <thead>
                <tr>
                  <th>{t("alias.originalFile")}</th>
                  <th>{t("alias.displayName")}</th>
                  <th>{t("alias.updatedAt")}</th>
                  <th>{t("alias.actions")}</th>
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
                      <td className="alias-updated-at">{formatDate(row.updatedAt, locale)}</td>
                      <td>
                        <div className="alias-row-actions">
                          {isEditing ? (
                            <>
                              <button type="button" onClick={() => commitEditing(row)}>
                                {t("common.save")}
                              </button>
                              <button type="button" onClick={stopEditing}>
                                {t("common.cancel")}
                              </button>
                            </>
                          ) : (
                            <>
                              <button type="button" onClick={() => startEditing(row)}>
                                {t("common.edit")}
                              </button>
                              <button type="button" onClick={() => onDelete(row)}>
                                {t("common.delete")}
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
