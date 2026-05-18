import { app, BrowserWindow, dialog, ipcMain, OpenDialogOptions } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const isDev = process.env.VITE_DEV_SERVER_URL !== undefined || !app.isPackaged;

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

  ipcMain.handle("dialog:openVideo", async () => {
    const parentWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    const dialogOptions: OpenDialogOptions = {
      title: "VR180動画を開く",
      properties: ["openFile"],
      filters: [
        { name: "Video Files", extensions: ["mp4", "mov", "m4v", "webm"] },
        { name: "All Files", extensions: ["*"] }
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
