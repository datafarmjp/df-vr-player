/// <reference types="vite/client" />

type OpenVideoResult = {
  path: string;
  url: string;
  name: string;
} | null;

interface Window {
  vr180?: {
    openVideo: () => Promise<OpenVideoResult>;
    openVideoPath: (path: string) => Promise<OpenVideoResult>;
    recoverVideoByName: (name: string) => Promise<OpenVideoResult>;
    openSupport: () => Promise<void>;
    getPathForFile: (file: File) => string;
  };
}
