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
    isMas: boolean;
    openVideo: (language?: string) => Promise<OpenVideoResult>;
    openPlaylistVideos: (language?: string) => Promise<OpenPlaylistVideosResult>;
    openVideoFolder: (language?: string) => Promise<OpenVideoFolderResult>;
    openVideoPath: (path: string) => Promise<OpenVideoResult>;
    recoverVideoByName: (name: string) => Promise<OpenVideoResult>;
    openSupport: () => Promise<void>;
    openExternal: (url: string) => Promise<void>;
    checkRelease: () => Promise<unknown>;
    getStorageItem: (key: string) => string | null;
    setStorageItem: (key: string, value: string) => boolean;
    getPathForFile: (file: File) => string;
  };
}
