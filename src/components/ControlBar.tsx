import { useState } from "react";
import {
  BookmarkPlus,
  Eye,
  FlipHorizontal,
  FlipVertical,
  FolderOpen,
  Gauge,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ZoomOut
} from "lucide-react";
import { PreviewEye } from "../vr/projectionModes";

type ControlBarProps = {
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  volume: number;
  isMuted: boolean;
  previewEye: PreviewEye;
  flipX: boolean;
  flipY: boolean;
  canAddBookmark: boolean;
  canGoPrevious: boolean;
  canGoNext: boolean;
  playbackRate: number;
  playbackRates: number[];
  onOpen: () => void;
  onAddBookmark: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onPlaybackRate: (playbackRate: number) => void;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onVolume: (volume: number) => void;
  onToggleMute: () => void;
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
  isMuted,
  previewEye,
  flipX,
  flipY,
  canAddBookmark,
  canGoPrevious,
  canGoNext,
  playbackRate,
  playbackRates,
  onOpen,
  onAddBookmark,
  onPrevious,
  onNext,
  onPlaybackRate,
  onTogglePlay,
  onSeek,
  onVolume,
  onToggleMute,
  onPreviewEye,
  onToggleFlipX,
  onToggleFlipY,
  onResetView,
  onResetZoom
}: ControlBarProps) {
  const [isRateMenuOpen, setIsRateMenuOpen] = useState(false);
  const [isVolumeMenuOpen, setIsVolumeMenuOpen] = useState(false);
  const playLabel = isPlaying ? "一時停止" : "再生";
  const volumePercent = Math.round(volume * 100);
  const volumeLabel = isMuted ? "ミュート中" : `音量 ${volumePercent}%`;

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
      <button aria-label="前の動画" className="icon-button" data-tooltip="前の動画" type="button" disabled={!canGoPrevious} onClick={onPrevious}>
        <SkipBack size={20} strokeWidth={2.2} />
      </button>
      <button aria-label="次の動画" className="icon-button" data-tooltip="次の動画" type="button" disabled={!canGoNext} onClick={onNext}>
        <SkipForward size={20} strokeWidth={2.2} />
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
      <div className="volume-menu">
        <button
          aria-label="音量"
          className={`icon-button volume-button ${isMuted ? "is-muted" : ""}`}
          data-tooltip={volumeLabel}
          title={volumeLabel}
          type="button"
          onClick={() => setIsVolumeMenuOpen((value) => !value)}
        >
          {isMuted ? <VolumeX size={17} strokeWidth={2.2} /> : <Volume2 size={17} strokeWidth={2.2} />}
          <span>{isMuted ? "off" : `${volumePercent}%`}</span>
        </button>
        {isVolumeMenuOpen && (
          <div className="volume-popover" role="group" aria-label="音量">
            <input
              aria-label="音量"
              className="volume-vertical"
              max={1}
              min={0}
              step={0.01}
              type="range"
              value={volume}
              onChange={(event) => onVolume(Number(event.currentTarget.value))}
            />
            <button className={isMuted ? "is-selected" : ""} type="button" onClick={onToggleMute}>
              {isMuted ? "解除" : "ミュート"}
            </button>
          </div>
        )}
      </div>
      <div className="rate-menu">
        <button
          aria-label="再生速度"
          className="icon-button rate-button"
          data-tooltip="再生速度"
          type="button"
          onClick={() => setIsRateMenuOpen((value) => !value)}
        >
          <Gauge size={17} strokeWidth={2.2} />
          <span>{playbackRate}x</span>
        </button>
        {isRateMenuOpen && (
          <div className="rate-options" role="menu" aria-label="再生速度">
            {playbackRates.map((rate) => (
              <button
                key={rate}
                className={playbackRate === rate ? "is-selected" : ""}
                type="button"
                role="menuitemradio"
                aria-checked={playbackRate === rate}
                onClick={() => {
                  onPlaybackRate(rate);
                  setIsRateMenuOpen(false);
                }}
              >
                {rate}x
              </button>
            ))}
          </div>
        )}
      </div>
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
