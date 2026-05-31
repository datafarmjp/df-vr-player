import { app, BrowserWindow, dialog, ipcMain, OpenDialogOptions, shell } from "electron";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const isDev = process.env.VITE_DEV_SERVER_URL !== undefined || !app.isPackaged;
const supportUrl = "https://buy.stripe.com/bJe4gyb7O6Gj66jbh49ws05";
const releaseInfoUrl = "https://info.datafarm.jp/media/releases/DF_VRPlayer/latest.json";
type Language = "ja" | "en";

const dialogTranslations: Record<Language, Record<string, string>> = {
  ja: {
    openVideoTitle: "VR180動画を開く",
    addPlaylistVideosTitle: "プレイリストに動画を追加",
    addVideoFolderTitle: "動画フォルダを追加",
    videoFiles: "Video Files",
    allFiles: "All Files"
  },
  en: {
    openVideoTitle: "Open VR180 Video",
    addPlaylistVideosTitle: "Add Videos to Playlist",
    addVideoFolderTitle: "Add Video Folder",
    videoFiles: "Video Files",
    allFiles: "All Files"
  }
};

const normalizeLanguage = (language: unknown): Language => {
  if (language === "ja" || language === "en") {
    return language;
  }
  return app.getLocale().toLowerCase().startsWith("en") ? "en" : "ja";
};

const storageFilePath = () => path.join(app.getPath("userData"), "storage.json");

const readStorage = (): Record<string, string> => {
  try {
    const raw = fsSync.readFileSync(storageFilePath(), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, string> : {};
  } catch {
    return {};
  }
};

const writeStorage = (storage: Record<string, string>) => {
  const filePath = storageFilePath();
  fsSync.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fsSync.writeFileSync(tempPath, `${JSON.stringify(storage, null, 2)}\n`);
  fsSync.renameSync(tempPath, filePath);
};

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: "DF VR Player",
    backgroundColor: "#101114",
    webPreferences: {
      preload: path.join(app.getAppPath(), "dist-electron/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (isDev) {
    window.loadURL("http://localhost:5173");
  } else {
    window.loadFile(path.join(app.getAppPath(), "dist/index.html"));
  }
}

app.whenReady().then(() => {
  const createVideoResult = async (inputPath: string) => {
    if (inputPath.startsWith("blob:") || inputPath.startsWith("http://") || inputPath.startsWith("https://")) {
      return {
        path: "",
        url: inputPath,
        name: path.basename(inputPath)
      };
    }

    const filePath = inputPath.startsWith("smb:")
      ? await resolveSmbUrlToMountedPath(inputPath)
      : inputPath.startsWith("file:")
        ? fileURLToPath(inputPath)
        : inputPath;
    return {
      path: filePath,
      url: pathToFileURL(filePath).toString(),
      name: path.basename(filePath)
    };
  };

  ipcMain.handle("dialog:openVideo", async (_event, language?: string) => {
    const labels = dialogTranslations[normalizeLanguage(language)];
    const parentWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    const dialogOptions: OpenDialogOptions = {
      title: labels.openVideoTitle,
      properties: ["openFile"],
      filters: [
        { name: labels.videoFiles, extensions: ["mp4", "mov", "m4v", "webm"] },
        { name: labels.allFiles, extensions: ["*"] }
      ]
    };
    const result = parentWindow
      ? await dialog.showOpenDialog(parentWindow, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return createVideoResult(result.filePaths[0]);
  });

  ipcMain.handle("dialog:openPlaylistVideos", async (_event, language?: string) => {
    const normalizedLanguage = normalizeLanguage(language);
    const labels = dialogTranslations[normalizedLanguage];
    const parentWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    const dialogOptions: OpenDialogOptions = {
      title: labels.addPlaylistVideosTitle,
      properties: ["openFile", "multiSelections"],
      filters: [
        { name: labels.videoFiles, extensions: ["mp4", "mov", "m4v", "webm"] },
        { name: labels.allFiles, extensions: ["*"] }
      ]
    };
    const result = parentWindow
      ? await dialog.showOpenDialog(parentWindow, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return Promise.all(
      result.filePaths
        .filter((filePath) => isVideoFileName(filePath))
        .sort((a, b) => path.basename(a).localeCompare(path.basename(b), normalizedLanguage, { numeric: true }))
        .map(createVideoResult)
    );
  });

  ipcMain.handle("dialog:openVideoFolder", async (_event, language?: string) => {
    const normalizedLanguage = normalizeLanguage(language);
    const labels = dialogTranslations[normalizedLanguage];
    const parentWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    const dialogOptions: OpenDialogOptions = {
      title: labels.addVideoFolderTitle,
      properties: ["openDirectory"]
    };
    const result = parentWindow
      ? await dialog.showOpenDialog(parentWindow, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const folderPath = result.filePaths[0];
    const entries = await fs.readdir(folderPath, { withFileTypes: true }).catch(() => []);
    const videos = entries
      .filter((entry) => entry.isFile() && isVideoFileName(entry.name))
      .map((entry) => path.join(folderPath, entry.name))
      .sort((a, b) => path.basename(a).localeCompare(path.basename(b), normalizedLanguage, { numeric: true }))
      .map((filePath) => ({
        path: filePath,
        url: pathToFileURL(filePath).toString(),
        name: path.basename(filePath)
      }));

    return {
      folderPath,
      name: path.basename(folderPath),
      videos
    };
  });

  ipcMain.handle("video:openPath", async (_event, filePath: string) => {
    if (!filePath) {
      return null;
    }

    return createVideoResult(filePath);
  });

  ipcMain.handle("video:recoverByName", async (_event, fileName: string) => {
    if (!fileName || fileName.includes(path.sep)) {
      return null;
    }

    const recoveredPath = await findFileInVolumes(fileName);
    return recoveredPath ? createVideoResult(recoveredPath) : null;
  });

  ipcMain.handle("shell:openSupport", async () => {
    await shell.openExternal(supportUrl);
  });

  ipcMain.handle("shell:openExternal", async (_event, url: string) => {
    if (!url.startsWith("https://")) {
      return;
    }
    await shell.openExternal(url);
  });

  ipcMain.handle("release:check", async () => {
    const response = await fetch(releaseInfoUrl, {
      headers: {
        accept: "application/json"
      }
    });
    if (!response.ok) {
      throw new Error(`Release check failed: ${response.status}`);
    }
    return response.json();
  });

  ipcMain.on("storage:get", (event, key: string) => {
    if (!key.startsWith("vr-smb-player:")) {
      event.returnValue = null;
      return;
    }
    event.returnValue = readStorage()[key] ?? null;
  });

  ipcMain.on("storage:set", (event, key: string, value: string) => {
    if (!key.startsWith("vr-smb-player:")) {
      event.returnValue = false;
      return;
    }
    try {
      const storage = readStorage();
      storage[key] = value;
      writeStorage(storage);
      event.returnValue = true;
    } catch {
      event.returnValue = false;
    }
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

async function resolveSmbUrlToMountedPath(smbUrl: string) {
  const url = new URL(smbUrl);
  const parts = url.pathname.split("/").filter(Boolean).map((part) => decodeURIComponent(part));
  const shareName = parts[0];
  const relativePath = parts.slice(1).join(path.sep);

  if (!shareName) {
    return smbUrl;
  }

  const volumes = await fs.readdir("/Volumes").catch(() => []);
  const volumeCandidates = [
    shareName,
    ...volumes.filter((volume) => volume === shareName || volume.startsWith(`${shareName}-`)).sort()
  ];
  const uniqueCandidates = Array.from(new Set(volumeCandidates));

  for (const volumeName of uniqueCandidates) {
    const candidatePath = path.join("/Volumes", volumeName, relativePath);
    if (await canAccess(candidatePath)) {
      return candidatePath;
    }
  }

  return path.join("/Volumes", shareName, relativePath);
}

async function canAccess(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function isVideoFileName(fileName: string) {
  return [".mp4", ".mov", ".m4v", ".webm"].some((extension) => fileName.toLowerCase().endsWith(extension));
}

async function findFileInVolumes(fileName: string) {
  const volumes = await fs.readdir("/Volumes", { withFileTypes: true }).catch(() => []);
  const roots = volumes
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => path.join("/Volumes", entry.name));

  for (const root of roots) {
    const match = await findFileByName(root, fileName, 0);
    if (match) {
      return match;
    }
  }

  return null;
}

async function findFileByName(directory: string, fileName: string, depth: number): Promise<string | null> {
  if (depth > 6) {
    return null;
  }

  const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }

    const entryPath = path.join(directory, entry.name);
    if (entry.isFile() && entry.name === fileName) {
      return entryPath;
    }

    if (entry.isDirectory()) {
      const match = await findFileByName(entryPath, fileName, depth + 1);
      if (match) {
        return match;
      }
    }
  }

  return null;
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
