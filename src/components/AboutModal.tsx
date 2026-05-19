import { useEffect } from "react";
import appIconUrl from "../assets/icon.png";

type AboutModalProps = {
  version: string;
  onClose: () => void;
  onOpenSupport: () => void;
};

export function AboutModal({ version, onClose, onOpenSupport }: AboutModalProps) {
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
          <p>Mac上でVR180/VR360動画を見るためのデスクトッププレイヤーです。</p>
          <p className="about-copyright">© 2026 株式会社データファーム</p>
        </div>
        <footer className="about-modal-actions">
          <button type="button" onClick={onOpenSupport}>
            開発支援 1,000円
          </button>
          <button type="button" onClick={onClose}>
            閉じる
          </button>
        </footer>
      </section>
    </div>
  );
}
