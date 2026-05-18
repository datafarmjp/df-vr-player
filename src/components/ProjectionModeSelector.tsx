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

export function ProjectionModeSelector({ value, onChange }: ProjectionModeSelectorProps) {
  return (
    <div className="segmented-control" aria-label="投影モード">
      {modes.map((mode) => (
        <button
          key={mode}
          className={value === mode ? "is-selected" : ""}
          type="button"
          onClick={() => onChange(mode)}
        >
          {projectionModeLabels[mode]}
        </button>
      ))}
    </div>
  );
}
