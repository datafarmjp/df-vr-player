/// <reference types="vite/client" />

type OpenVideoResult = {
  path: string;
  url: string;
  name: string;
} | null;

type OpenVideoFolderResult = {
  folderPath: string;
  name: string;
  videos: NonNullable<OpenVideoResult>[];
} | null;

type OpenPlaylistVideosResult = NonNullable<OpenVideoResult>[] | null;

interface Window {
  vr180?: {
    openVideo: () => Promise<OpenVideoResult>;
    openPlaylistVideos: () => Promise<OpenPlaylistVideosResult>;
    openVideoFolder: () => Promise<OpenVideoFolderResult>;
    openVideoPath: (path: string) => Promise<OpenVideoResult>;
    recoverVideoByName: (name: string) => Promise<OpenVideoResult>;
    openSupport: () => Promise<void>;
    getPathForFile: (file: File) => string;
  };
}
