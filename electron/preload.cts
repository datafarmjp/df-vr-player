import { contextBridge, ipcRenderer, webUtils } from "electron";

export type OpenVideoResult = {
  path: string;
  url: string;
  name: string;
} | null;

export type OpenVideoFolderResult = {
  folderPath: string;
  name: string;
  videos: NonNullable<OpenVideoResult>[];
} | null;

export type OpenPlaylistVideosResult = NonNullable<OpenVideoResult>[] | null;

contextBridge.exposeInMainWorld("vr180", {
  openVideo: (language?: string) => ipcRenderer.invoke("dialog:openVideo", language) as Promise<OpenVideoResult>,
  openPlaylistVideos: (language?: string) => ipcRenderer.invoke("dialog:openPlaylistVideos", language) as Promise<OpenPlaylistVideosResult>,
  openVideoFolder: (language?: string) => ipcRenderer.invoke("dialog:openVideoFolder", language) as Promise<OpenVideoFolderResult>,
  openVideoPath: (path: string) => ipcRenderer.invoke("video:openPath", path) as Promise<OpenVideoResult>,
  recoverVideoByName: (name: string) => ipcRenderer.invoke("video:recoverByName", name) as Promise<OpenVideoResult>,
  openSupport: () => ipcRenderer.invoke("shell:openSupport") as Promise<void>,
  openExternal: (url: string) => ipcRenderer.invoke("shell:openExternal", url) as Promise<void>,
  checkRelease: () => ipcRenderer.invoke("release:check") as Promise<unknown>,
  getPathForFile: (file: File) => webUtils.getPathForFile(file)
});
