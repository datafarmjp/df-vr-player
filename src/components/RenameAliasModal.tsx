import { useEffect, useState } from "react";
import { useI18n } from "../i18n";
import { FileAlias, getFileAlias, HistoryItem } from "../state/historyStore";

type RenameAliasModalProps = {
  aliases: Record<string, FileAlias>;
  item: HistoryItem;
  onClose: () => void;
  onSave: (displayName: string) => void;
};

export function RenameAliasModal({ aliases, item, onClose, onSave }: RenameAliasModalProps) {
  const { t } = useI18n();
  const [draftName, setDraftName] = useState(() => getFileAlias(aliases, item)?.displayName ?? item.name);

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
      <section className="rename-modal" role="dialog" aria-modal="true" aria-labelledby="rename-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="rename-modal-header">
          <h2 id="rename-modal-title">{t("rename.aliasTitle")}</h2>
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
            {t("common.save")}
          </button>
          <button type="button" onClick={onClose}>
            {t("common.cancel")}
          </button>
        </footer>
      </section>
    </div>
  );
}
