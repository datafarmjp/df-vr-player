import { contextBridge, ipcRenderer, webUtils } from "electron";

export type OpenVideoResult = {
  path: string;
  url: string;
  name: string;
} | null;

contextBridge.exposeInMainWorld("vr180", {
  openVideo: () => ipcRenderer.invoke("dialog:openVideo") as Promise<OpenVideoResult>,
  openVideoPath: (path: string) => ipcRenderer.invoke("video:openPath", path) as Promise<OpenVideoResult>,
  recoverVideoByName: (name: string) => ipcRenderer.invoke("video:recoverByName", name) as Promise<OpenVideoResult>,
  getPathForFile: (file: File) => webUtils.getPathForFile(file)
});
