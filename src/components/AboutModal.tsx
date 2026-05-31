import { useEffect } from "react";
import appIconUrl from "../assets/icon.png";
import { useI18n } from "../i18n";

type AboutModalProps = {
  version: string;
  onClose: () => void;
  onOpenSupport: () => void;
};

export function AboutModal({ version, onClose, onOpenSupport }: AboutModalProps) {
  const { t } = useI18n();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="about-modal" role="dialog" aria-modal="true" aria-labelledby="about-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="about-modal-header">
          <img alt="" src={appIconUrl} />
          <div>
            <h2 id="about-modal-title">DF VR Player</h2>
            <p>Version {version}</p>
          </div>
        </header>
        <div className="about-modal-body">
          <p>{t("about.description")}</p>
          <p className="about-copyright">{t("about.copyright")}</p>
        </div>
        <footer className="about-modal-actions">
          <button type="button" onClick={onOpenSupport}>
            {t("about.support")}
          </button>
          <button type="button" onClick={onClose}>
            {t("common.close")}
          </button>
        </footer>
      </section>
    </div>
  );
}
