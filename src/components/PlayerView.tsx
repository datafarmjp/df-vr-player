import { useEffect, useRef } from "react";
import { attachCameraControls, CameraControls } from "../vr/cameraControls";
import { createScene, VrScene } from "../vr/createScene";
import { createVideoTexture } from "../vr/createVideoTexture";
import { PreviewEye, ProjectionMode } from "../vr/projectionModes";

type PlayerViewProps = {
  videoUrl: string | null;
  projectionMode: ProjectionMode;
  previewEye: PreviewEye;
  flipX: boolean;
  flipY: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  resetSignal: number;
  zoomResetSignal: number;
  onLoadedMetadata: () => void;
  onTimeUpdate: () => void;
  onPlayStateChange: (isPlaying: boolean) => void;
  onVideoError: () => void;
  onEnded: () => void;
};

export function PlayerView({
  videoUrl,
  projectionMode,
  previewEye,
  flipX,
  flipY,
  videoRef,
  resetSignal,
  zoomResetSignal,
  onLoadedMetadata,
  onTimeUpdate,
  onPlayStateChange,
  onVideoError,
  onEnded
}: PlayerViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<VrScene | null>(null);
  const controlsRef = useRef<CameraControls | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;

    if (!container || !video || !videoUrl) {
      return;
    }

    const texture = createVideoTexture(video);
    const vrScene = createScene(container, texture);
    const controls = attachCameraControls(vrScene.renderer.domElement, vrScene.camera);
    let frameId = 0;

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      vrScene.camera.aspect = width / Math.max(height, 1);
      vrScene.camera.updateProjectionMatrix();
      vrScene.renderer.setSize(width, height, false);
    };

    const render = () => {
      frameId = requestAnimationFrame(render);
      vrScene.renderer.render(vrScene.scene, vrScene.camera);
    };

    sceneRef.current = vrScene;
    controlsRef.current = controls;
    vrScene.setProjectionSettings({ mode: projectionMode, eye: previewEye, flipX, flipY });
    resize();
    render();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", resize);
      controls.dispose();
      vrScene.dispose();
      controlsRef.current = null;
      sceneRef.current = null;
    };
  }, [videoRef, videoUrl]);

  useEffect(() => {
    sceneRef.current?.setProjectionSettings({ mode: projectionMode, eye: previewEye, flipX, flipY });
  }, [flipX, flipY, previewEye, projectionMode]);

  useEffect(() => {
    controlsRef.current?.resetView();
  }, [resetSignal]);

  useEffect(() => {
    controlsRef.current?.resetZoom();
  }, [zoomResetSignal]);

  return (
    <main
      className={`player-shell ${projectionMode === "flat" ? "is-flat" : ""}`}
      style={{ "--video-scale-x": flipX ? -1 : 1, "--video-scale-y": flipY ? -1 : 1 } as React.CSSProperties}
    >
      <div ref={containerRef} className="viewer" />
      {!videoUrl && (
        <div className="empty-state">
          <h1>DF VR Player</h1>
        </div>
      )}
      <video
        ref={videoRef}
        className="source-video"
        crossOrigin="anonymous"
        playsInline
        src={videoUrl ?? undefined}
        onLoadedMetadata={onLoadedMetadata}
        onPause={() => onPlayStateChange(false)}
        onPlay={() => onPlayStateChange(true)}
        onTimeUpdate={onTimeUpdate}
        onError={onVideoError}
        onEnded={onEnded}
      />
    </main>
  );
}
