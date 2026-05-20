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
  openVideo: () => ipcRenderer.invoke("dialog:openVideo") as Promise<OpenVideoResult>,
  openPlaylistVideos: () => ipcRenderer.invoke("dialog:openPlaylistVideos") as Promise<OpenPlaylistVideosResult>,
  openVideoFolder: () => ipcRenderer.invoke("dialog:openVideoFolder") as Promise<OpenVideoFolderResult>,
  openVideoPath: (path: string) => ipcRenderer.invoke("video:openPath", path) as Promise<OpenVideoResult>,
  recoverVideoByName: (name: string) => ipcRenderer.invoke("video:recoverByName", name) as Promise<OpenVideoResult>,
  openSupport: () => ipcRenderer.invoke("shell:openSupport") as Promise<void>,
  getPathForFile: (file: File) => webUtils.getPathForFile(file)
});
