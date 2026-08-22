const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");
const { pathToFileURL } = require("url");

app.setName("Watermark Studio");
if (process.platform === "win32") {
  app.setAppUserModelId("com.watermarkstudio.app");
}

function unpackPath(binPath) {
  if (!binPath) return binPath;
  return String(binPath).replace("app.asar", "app.asar.unpacked");
}

function resolveBinary(packagedName, modulePath) {
  if (app.isPackaged) {
    const bundled = path.join(process.resourcesPath, packagedName);
    if (fs.existsSync(bundled)) return bundled;
  }
  return unpackPath(modulePath);
}

function ffmpegPath() {
  return resolveBinary("ffmpeg.exe", require("ffmpeg-static"));
}

function ffprobePath() {
  return resolveBinary("ffprobe.exe", require("ffprobe-static").path);
}

function appIcon() {
  const ico = path.join(__dirname, "build", "icon.ico");
  const png = path.join(__dirname, "build", "icon.png");
  if (fs.existsSync(ico)) return ico;
  if (fs.existsSync(png)) return png;
  return undefined;
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#000000",
    title: "Watermark Studio",
    icon: appIcon(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("dialog:openMedia", async (_event, kind) => {
  const imageExts = ["png", "jpg", "jpeg", "webp", "bmp", "gif", "tif", "tiff"];
  const videoExts = ["mp4", "mov", "m4v", "avi", "mkv", "webm"];
  let title = "Add files";
  let filters;
  if (kind === "image") {
    title = "Add photos";
    filters = [{ name: "Images", extensions: imageExts }];
  } else if (kind === "video") {
    title = "Add videos";
    filters = [{ name: "Videos", extensions: videoExts }];
  } else {
    filters = [
      { name: "Images and videos", extensions: [...imageExts, ...videoExts] },
      { name: "Images", extensions: imageExts },
      { name: "Videos", extensions: videoExts },
    ];
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    title,
    properties: ["openFile", "multiSelections"],
    filters,
  });

  if (result.canceled || !result.filePaths.length) return [];
  return result.filePaths.map(describeMedia);
});

ipcMain.handle("path:join", async (_event, parts) => path.join(...parts));

ipcMain.handle("media:fromPath", async (_event, filePath) => describeMedia(filePath));

function uniqueInDownloads(fileName) {
  const dir = app.getPath("downloads");
  fs.mkdirSync(dir, { recursive: true });
  const base = path.basename(String(fileName || "export"));
  const parsed = path.parse(base);
  let candidate = path.join(dir, base);
  let i = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${parsed.name}-${i}${parsed.ext}`);
    i += 1;
  }
  return candidate;
}

function toNodeBuffer(data) {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof ArrayBuffer) return Buffer.from(Uint8Array.from(new Uint8Array(data)));
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(Uint8Array.from(new Uint8Array(data.buffer, data.byteOffset, data.byteLength)));
  }
  if (data && Array.isArray(data.data)) return Buffer.from(data.data);
  if (Array.isArray(data)) return Buffer.from(data);
  return Buffer.from(Uint8Array.from(data || []));
}

ipcMain.handle("path:downloadsDir", async () => app.getPath("downloads"));

ipcMain.handle("path:uniqueDownload", async (_event, fileName) => uniqueInDownloads(fileName));

ipcMain.handle("file:read", async (_event, filePath) => fs.readFileSync(filePath));

ipcMain.handle("file:saveToDownloads", async (_event, { fileName, bytes }) => {
  const outPath = uniqueInDownloads(fileName);
  fs.writeFileSync(outPath, toNodeBuffer(bytes));
  return outPath;
});

ipcMain.handle("file:writeBuffer", async (_event, { filePath, data }) => {
  fs.writeFileSync(filePath, toNodeBuffer(data));
  return filePath;
});

ipcMain.handle("shell:showItem", async (_event, filePath) => {
  shell.showItemInFolder(filePath);
});

ipcMain.handle("video:probe", async (_event, filePath) => {
  return probeVideo(filePath);
});

ipcMain.handle("video:export", async (event, options) => {
  return exportVideo(event, options);
});

function describeMedia(filePath) {
  const ext = path.extname(filePath).toLowerCase().replace(".", "");
  const videoExts = new Set(["mp4", "mov", "m4v", "avi", "mkv", "webm"]);
  const kind = videoExts.has(ext) ? "video" : "image";
  return {
    path: filePath,
    url: pathToFileURL(filePath).href,
    name: path.basename(filePath),
    ext,
    kind,
  };
}

function runProcess(bin, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr.trim() || `Process exited with code ${code}`));
    });
  });
}

async function probeVideo(filePath) {
  const { stdout } = await runProcess(ffprobePath(), [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filePath,
  ]);
  const info = JSON.parse(stdout);
  const video = (info.streams || []).find((stream) => stream.codec_type === "video");
  const audio = (info.streams || []).find((stream) => stream.codec_type === "audio");
  if (!video) throw new Error("No video stream found.");
  return {
    width: Number(video.width) || 0,
    height: Number(video.height) || 0,
    duration: Number(info.format?.duration || video.duration || 0),
    hasAudio: Boolean(audio),
  };
}

function bounceFilter(speed) {
  const vx = Math.max(40, Number(speed) || 160);
  const vy = Math.round(vx * 0.72);
  return `overlay=x='abs(mod(t*${vx}\\,2*(W-w))-(W-w))':y='abs(mod(t*${vy}\\,2*(H-h))-(H-h))'`;
}

function staticOverlayFilter(position) {
  const pad = 40;
  const map = {
    "top-left": `${pad}:${pad}`,
    "top-right": `main_w-overlay_w-${pad}:${pad}`,
    "bottom-left": `${pad}:main_h-overlay_h-${pad}`,
    "bottom-right": `main_w-overlay_w-${pad}:main_h-overlay_h-${pad}`,
    center: "(main_w-overlay_w)/2:(main_h-overlay_h)/2",
  };
  return `overlay=${map[position] || map.center}`;
}

function overlayFilter(layout, motion, position, bounceSpeed) {
  if (layout === "pattern") return "overlay=0:0";
  if (motion === "bounce") return bounceFilter(bounceSpeed);
  return staticOverlayFilter(position);
}

function encodeArgs(inputPath, overlayPath, outputPath, filter, audioMode) {
  const args = [
    "-y",
    "-i",
    inputPath,
    "-i",
    overlayPath,
    "-filter_complex",
    filter,
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "14",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
  ];
  if (audioMode === "copy") args.push("-c:a", "copy");
  else if (audioMode === "aac") args.push("-c:a", "aac", "-b:a", "192k");
  else args.push("-an");
  args.push("-progress", "pipe:1", "-nostats", outputPath);
  return args;
}

function runFfmpegEncode(event, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath(), args, { windowsHide: true });
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      const match = text.match(/out_time_ms=(\d+)/);
      if (match) {
        event.sender.send("video:progress", { outTimeMs: Number(match[1]) });
      }
      if (text.includes("progress=end")) {
        event.sender.send("video:progress", { done: true });
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `FFmpeg exited with code ${code}`));
    });
  });
}

async function exportVideo(event, options) {
  const {
    inputPath,
    outputPath,
    overlayPng,
    layout,
    motion,
    position,
    bounceSpeed,
    hasAudio,
  } = options;

  const tempOverlay = path.join(os.tmpdir(), `watermark-overlay-${Date.now()}.png`);
  fs.writeFileSync(tempOverlay, Buffer.from(overlayPng));

  const filter = overlayFilter(layout, motion, position, bounceSpeed);
  const audioModes = hasAudio ? ["copy", "aac"] : ["none"];

  try {
    let lastError = null;
    for (const audioMode of audioModes) {
      try {
        await runFfmpegEncode(
          event,
          encodeArgs(inputPath, tempOverlay, outputPath, filter, audioMode)
        );
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError) throw lastError;
    return { outputPath };
  } finally {
    try {
      fs.unlinkSync(tempOverlay);
    } catch {
      // ignore cleanup errors
    }
  }
}
