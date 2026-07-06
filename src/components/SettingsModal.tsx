import { useEffect } from "react";
import appIconUrl from "../assets/icon.png";
import { languageLabels, supportedLanguages, useI18n, type Language } from "../i18n";

type SettingsModalProps = {
  build: string;
  version: string;
  onClose: () => void;
};

export function SettingsModal({ build, version, onClose }: SettingsModalProps) {
  const { language, setLanguage, t } = useI18n();

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
      <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="settings-modal-header">
          <div>
            <p className="eyebrow">{t("settings.title")}</p>
            <h2 id="settings-modal-title">DF VR Player</h2>
          </div>
          <button type="button" onClick={onClose}>
            {t("common.close")}
          </button>
        </header>

        <div className="settings-section">
          <h3>{t("settings.general")}</h3>
          <label className="settings-row">
            <span>{t("settings.language")}</span>
            <select value={language} onChange={(event) => setLanguage(event.currentTarget.value as Language)}>
              {supportedLanguages.map((supportedLanguage) => (
                <option key={supportedLanguage} value={supportedLanguage}>
                  {languageLabels[supportedLanguage]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="settings-section">
          <h3>{t("settings.appInfo")}</h3>
          <div className="settings-app-info">
            <img alt="" src={appIconUrl} />
            <div>
              <strong>DF VR Player</strong>
              <p>{t("about.description")}</p>
            </div>
          </div>
          <dl className="settings-meta">
            <div>
              <dt>{t("settings.version")}</dt>
              <dd>{version}</dd>
            </div>
            <div>
              <dt>{t("settings.build")}</dt>
              <dd>{build}</dd>
            </div>
          </dl>
          <p className="settings-copyright">{t("about.copyright")}</p>
        </div>
      </section>
    </div>
  );
}
