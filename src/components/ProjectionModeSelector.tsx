import { useI18n } from "../i18n";
import { ProjectionMode, projectionModeLabels } from "../vr/projectionModes";

type ProjectionModeSelectorProps = {
  value: ProjectionMode;
  onChange: (mode: ProjectionMode) => void;
};

const modes: ProjectionMode[] = [
  "vr180-sbs",
  "vr180-tb",
  "vr180-2d",
  "vr360-sbs",
  "vr360-tb",
  "vr360-2d",
  "flat"
];

const shortLabels: Record<ProjectionMode, string> = {
  "vr180-sbs": "180 LR",
  "vr180-tb": "180 TB",
  "vr180-2d": "180 2D",
  "vr360-sbs": "360 LR",
  "vr360-tb": "360 TB",
  "vr360-2d": "360 2D",
  flat: "2D"
};

export function ProjectionModeSelector({ value, onChange }: ProjectionModeSelectorProps) {
  const { t } = useI18n();

  return (
    <div className="segmented-control" aria-label={t("projection.aria")}>
      {modes.map((mode) => (
        <button
          key={mode}
          className={value === mode ? "is-selected" : ""}
          aria-label={projectionModeLabels[mode]}
          data-tooltip={projectionModeLabels[mode]}
          title={projectionModeLabels[mode]}
          type="button"
          draggable={false}
          onDragStart={(event) => event.preventDefault()}
          onClick={() => onChange(mode)}
        >
          <svg className="projection-label" viewBox="0 0 72 28" aria-hidden="true" focusable="false">
            <text x="36" y="18" textAnchor="middle">
              {shortLabels[mode]}
            </text>
          </svg>
        </button>
      ))}
    </div>
  );
}
