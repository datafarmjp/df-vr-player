import * as THREE from "three";
import { isVr360Projection, ProjectionSettings } from "./projectionModes";

export type VrScene = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  material: THREE.MeshBasicMaterial;
  setProjectionSettings: (settings: ProjectionSettings) => void;
  dispose: () => void;
};

function createProjectionGeometry(isVr360: boolean) {
  return isVr360
    ? new THREE.SphereGeometry(500, 128, 64, -Math.PI / 2, Math.PI * 2, 0, Math.PI)
    : new THREE.SphereGeometry(500, 96, 48, -Math.PI, Math.PI, 0, Math.PI);
}

export function createScene(container: HTMLElement, texture: THREE.VideoTexture): VrScene {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 2000);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide });
  let currentIsVr360 = false;
  let geometry = createProjectionGeometry(currentIsVr360);
  const mesh = new THREE.Mesh(geometry, material);

  scene.add(mesh);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x101114, 1);
  container.appendChild(renderer.domElement);

  const setCrop = (x: number, y: number, width: number, height: number, flipX: boolean, flipY: boolean) => {
    texture.repeat.set(flipX ? -width : width, flipY ? -height : height);
    texture.offset.set(flipX ? x + width : x, flipY ? y + height : y);
    texture.needsUpdate = true;
  };

  const setProjectionSettings = ({ mode, eye, flipX, flipY }: ProjectionSettings) => {
    const nextIsVr360 = isVr360Projection(mode);
    if (nextIsVr360 !== currentIsVr360) {
      geometry.dispose();
      geometry = createProjectionGeometry(nextIsVr360);
      mesh.geometry = geometry;
      currentIsVr360 = nextIsVr360;
    }

    if (mode.endsWith("-sbs")) {
      setCrop(eye === "left" ? 0 : 0.5, 0, 0.5, 1, flipX, flipY);
      return;
    }

    if (mode.endsWith("-tb")) {
      setCrop(0, eye === "left" ? 0.5 : 0, 1, 0.5, flipX, flipY);
      return;
    }

    setCrop(0, 0, 1, 1, flipX, flipY);
  };

  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };

  resize();

  return {
    scene,
    camera,
    renderer,
    material,
    setProjectionSettings,
    dispose: () => {
      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    }
  };
}
