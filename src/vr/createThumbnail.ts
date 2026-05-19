import { PreviewEye, ProjectionMode } from "./projectionModes";

type ThumbnailOptions = {
  projectionMode: ProjectionMode;
  previewEye: PreviewEye;
  seekSeconds?: number;
};

const thumbnailSeekSeconds = 15;

export async function createVideoThumbnail(videoUrl: string, options: ThumbnailOptions): Promise<string> {
  const video = document.createElement("video");
  video.src = videoUrl;
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";

  const cleanup = () => {
    video.removeAttribute("src");
    video.load();
  };

  try {
    await waitForEvent(video, "loadedmetadata");
    const targetSeekSeconds = options.seekSeconds ?? thumbnailSeekSeconds;
    const seekTime = Number.isFinite(video.duration) && video.duration > 0
      ? Math.min(Math.max(targetSeekSeconds, 0), Math.max(video.duration - 0.1, 0))
      : 0;
    video.currentTime = seekTime;
    await waitForEvent(video, "seeked");

    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 90;
    const context = canvas.getContext("2d");
    if (!context || video.videoWidth === 0 || video.videoHeight === 0) {
      throw new Error("Video frame is not drawable.");
    }

    context.fillStyle = "#101114";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const crop = getSourceCrop(video.videoWidth, video.videoHeight, options);
    const sourceRatio = crop.width / crop.height;
    const targetRatio = canvas.width / canvas.height;
    const drawWidth = sourceRatio > targetRatio ? canvas.width : canvas.height * sourceRatio;
    const drawHeight = sourceRatio > targetRatio ? canvas.width / sourceRatio : canvas.height;
    const drawX = (canvas.width - drawWidth) / 2;
    const drawY = (canvas.height - drawHeight) / 2;
    context.drawImage(video, crop.x, crop.y, crop.width, crop.height, drawX, drawY, drawWidth, drawHeight);
    return canvas.toDataURL("image/jpeg", 0.72);
  } finally {
    cleanup();
  }
}

function getSourceCrop(videoWidth: number, videoHeight: number, { projectionMode, previewEye }: ThumbnailOptions) {
  if (projectionMode.endsWith("-sbs")) {
    return {
      x: previewEye === "left" ? 0 : videoWidth / 2,
      y: 0,
      width: videoWidth / 2,
      height: videoHeight
    };
  }

  if (projectionMode.endsWith("-tb")) {
    return {
      x: 0,
      y: previewEye === "left" ? 0 : videoHeight / 2,
      width: videoWidth,
      height: videoHeight / 2
    };
  }

  return {
    x: 0,
    y: 0,
    width: videoWidth,
    height: videoHeight
  };
}

function waitForEvent(target: HTMLVideoElement, eventName: "loadedmetadata" | "seeked") {
  return new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${eventName}.`));
    }, 7000);

    const onEvent = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error(`Video failed before ${eventName}.`));
    };

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      target.removeEventListener(eventName, onEvent);
      target.removeEventListener("error", onError);
    };

    target.addEventListener(eventName, onEvent, { once: true });
    target.addEventListener("error", onError, { once: true });
  });
}
