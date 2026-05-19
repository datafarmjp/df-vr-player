import {
  BookmarkPlus,
  Eye,
  FlipHorizontal,
  FlipVertical,
  FolderOpen,
  Pause,
  Play,
  RotateCcw,
  ZoomOut
} from "lucide-react";
import { PreviewEye } from "../vr/projectionModes";

type ControlBarProps = {
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  volume: number;
  previewEye: PreviewEye;
  flipX: boolean;
  flipY: boolean;
  canAddBookmark: boolean;
  onOpen: () => void;
  onAddBookmark: () => void;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onVolume: (volume: number) => void;
  onPreviewEye: (eye: PreviewEye) => void;
  onToggleFlipX: () => void;
  onToggleFlipY: () => void;
  onResetView: () => void;
  onResetZoom: () => void;
};

const formatTime = (value: number) => {
  if (!Number.isFinite(value)) {
    return "0:00";
  }

  const totalSeconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export function ControlBar({
  isPlaying,
  duration,
  currentTime,
  volume,
  previewEye,
  flipX,
  flipY,
  canAddBookmark,
  onOpen,
  onAddBookmark,
  onTogglePlay,
  onSeek,
  onVolume,
  onPreviewEye,
  onToggleFlipX,
  onToggleFlipY,
  onResetView,
  onResetZoom
}: ControlBarProps) {
  const playLabel = isPlaying ? "一時停止" : "再生";

  return (
    <footer className="control-bar">
      <button aria-label="開く" className="icon-button primary" data-tooltip="開く" type="button" onClick={onOpen}>
        <FolderOpen size={20} strokeWidth={2.2} />
      </button>
      <button aria-label={playLabel} className="icon-button" data-tooltip={playLabel} type="button" onClick={onTogglePlay}>
        {isPlaying ? <Pause size={20} strokeWidth={2.2} /> : <Play size={20} strokeWidth={2.2} />}
      </button>
      <button
        aria-label="ブックマーク追加"
        className="icon-button"
        data-tooltip="ブックマーク追加"
        type="button"
        disabled={!canAddBookmark}
        onClick={onAddBookmark}
      >
        <BookmarkPlus size={20} strokeWidth={2.2} />
      </button>
      <span className="time">{formatTime(currentTime)}</span>
      <input
        aria-label="シーク"
        className="seek"
        max={Number.isFinite(duration) ? duration : 0}
        min={0}
        step={0.1}
        type="range"
        value={Number.isFinite(currentTime) ? currentTime : 0}
        onChange={(event) => onSeek(Number(event.currentTarget.value))}
      />
      <span className="time">{formatTime(duration)}</span>
      <input
        aria-label="音量"
        className="volume"
        max={1}
        min={0}
        step={0.01}
        type="range"
        value={volume}
        onChange={(event) => onVolume(Number(event.currentTarget.value))}
      />
      <div className="compact-segment" aria-label="プレビューする目">
        <button
          aria-label="左目"
          className={previewEye === "left" ? "is-selected" : ""}
          data-tooltip="左目"
          type="button"
          onClick={() => onPreviewEye("left")}
        >
          <Eye size={16} strokeWidth={2.2} />
          <span>L</span>
        </button>
        <button
          aria-label="右目"
          className={previewEye === "right" ? "is-selected" : ""}
          data-tooltip="右目"
          type="button"
          onClick={() => onPreviewEye("right")}
        >
          <Eye size={16} strokeWidth={2.2} />
          <span>R</span>
        </button>
      </div>
      <button
        aria-label="左右反転"
        className={`icon-button ${flipX ? "is-active" : ""}`}
        data-tooltip="左右反転"
        type="button"
        onClick={onToggleFlipX}
      >
        <FlipHorizontal size={20} strokeWidth={2.2} />
      </button>
      <button
        aria-label="上下反転"
        className={`icon-button ${flipY ? "is-active" : ""}`}
        data-tooltip="上下反転"
        type="button"
        onClick={onToggleFlipY}
      >
        <FlipVertical size={20} strokeWidth={2.2} />
      </button>
      <button aria-label="視点リセット" className="icon-button" data-tooltip="視点リセット" type="button" onClick={onResetView}>
        <RotateCcw size={20} strokeWidth={2.2} />
      </button>
      <button aria-label="ズームリセット" className="icon-button" data-tooltip="ズームリセット" type="button" onClick={onResetZoom}>
        <ZoomOut size={20} strokeWidth={2.2} />
      </button>
    </footer>
  );
}
