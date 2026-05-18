export type ProjectionMode =
  | "vr180-2d"
  | "vr180-sbs"
  | "vr180-tb"
  | "vr360-2d"
  | "vr360-sbs"
  | "vr360-tb"
  | "flat";
export type PreviewEye = "left" | "right";

export type ProjectionSettings = {
  mode: ProjectionMode;
  eye: PreviewEye;
  flipX: boolean;
  flipY: boolean;
};

export const projectionModeLabels: Record<ProjectionMode, string> = {
  "vr180-2d": "VR180 2D",
  "vr180-sbs": "180 SBS",
  "vr180-tb": "180 T/B",
  "vr360-2d": "VR360 2D",
  "vr360-sbs": "360 SBS",
  "vr360-tb": "360 T/B",
  flat: "2D"
};

export function isStereoProjection(mode: ProjectionMode) {
  return mode.endsWith("-sbs") || mode.endsWith("-tb");
}

export function isVr360Projection(mode: ProjectionMode) {
  return mode.startsWith("vr360");
}
