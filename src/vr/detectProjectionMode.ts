import { ProjectionMode } from "./projectionModes";

type ProjectionFamily = "vr180" | "vr360";

export type ProjectionDetection = {
  mode: ProjectionMode;
  needsVideoSizeLayout: boolean;
};

const token = (value: string) => ` ${value.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;

function hasToken(text: string, values: string[]) {
  return values.some((value) => text.includes(` ${value} `));
}

function detectFamily(text: string): ProjectionFamily {
  if (/(^|[^0-9])360([^0-9]|$)/.test(text) || hasToken(text, ["vr360"])) {
    return "vr360";
  }

  if (/(^|[^0-9])180([^0-9]|$)/.test(text) || hasToken(text, ["vr180"])) {
    return "vr180";
  }

  return "vr180";
}

function modeFor(family: ProjectionFamily, layout: "sbs" | "tb") {
  return `${family}-${layout}` as ProjectionMode;
}

export function detectProjectionModeFromName(...values: Array<string | undefined>): ProjectionDetection {
  const text = token(values.filter(Boolean).join(" "));
  const family = detectFamily(text);

  if (hasToken(text, ["tb", "top", "bottom", "topbottom", "top-bottom", "ou", "over", "under", "overunder", "over-under"])) {
    return {
      mode: modeFor(family, "tb"),
      needsVideoSizeLayout: false
    };
  }

  if (hasToken(text, ["sbs", "side", "sidebyside", "side-by-side", "lr", "left", "right", "leftright", "left-right", "3d"])) {
    return {
      mode: modeFor(family, "sbs"),
      needsVideoSizeLayout: false
    };
  }

  return {
    mode: modeFor(family, "sbs"),
    needsVideoSizeLayout: true
  };
}

export function detectProjectionModeFromVideoSize(currentMode: ProjectionMode, videoWidth: number, videoHeight: number): ProjectionMode {
  if (videoWidth <= 0 || videoHeight <= 0 || currentMode === "flat") {
    return currentMode;
  }

  const family = currentMode.startsWith("vr360") ? "vr360" : "vr180";
  const ratio = videoWidth / videoHeight;

  if (ratio <= 1.25) {
    return modeFor(family, "tb");
  }

  if (ratio >= 1.6) {
    return modeFor(family, "sbs");
  }

  return currentMode;
}
