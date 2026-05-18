import * as THREE from "three";

export type CameraControls = {
  update: () => void;
  resetView: () => void;
  resetZoom: () => void;
  dispose: () => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function attachCameraControls(canvas: HTMLCanvasElement, camera: THREE.PerspectiveCamera): CameraControls {
  let yaw = 0;
  let pitch = 0;
  let fov = 75;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const update = () => {
    camera.fov = fov;
    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
    camera.updateProjectionMatrix();
  };

  const pointerDown = (event: PointerEvent) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  };

  const pointerMove = (event: PointerEvent) => {
    if (!dragging) {
      return;
    }

    const deltaX = event.clientX - lastX;
    const deltaY = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    yaw -= deltaX * 0.004;
    pitch = clamp(pitch - deltaY * 0.004, -Math.PI / 2, Math.PI / 2);
    update();
  };

  const pointerUp = (event: PointerEvent) => {
    dragging = false;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  const wheel = (event: WheelEvent) => {
    event.preventDefault();
    fov = clamp(fov + event.deltaY * 0.035, 35, 100);
    update();
  };

  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointermove", pointerMove);
  canvas.addEventListener("pointerup", pointerUp);
  canvas.addEventListener("pointercancel", pointerUp);
  canvas.addEventListener("wheel", wheel, { passive: false });
  update();

  return {
    update,
    resetView: () => {
      yaw = 0;
      pitch = 0;
      update();
    },
    resetZoom: () => {
      fov = 75;
      update();
    },
    dispose: () => {
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", pointerUp);
      canvas.removeEventListener("wheel", wheel);
    }
  };
}
