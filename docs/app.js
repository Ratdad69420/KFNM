const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "webp", "bmp", "gif", "tif", "tiff"]);

const els = {
  exportBtn: document.getElementById("exportBtn"),
  addPhotosBtn: document.getElementById("addPhotosBtn"),
  addVideosBtn: document.getElementById("addVideosBtn"),
  photoInput: document.getElementById("photoInput"),
  videoInput: document.getElementById("videoInput"),
  photoList: document.getElementById("photoList"),
  videoList: document.getElementById("videoList"),
  filePanel: document.getElementById("filePanel"),
  stage: document.getElementById("stage"),
  emptyState: document.getElementById("emptyState"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  navLabel: document.getElementById("navLabel"),
  previewImage: document.getElementById("previewImage"),
  previewVideo: document.getElementById("previewVideo"),
  overlay: document.getElementById("overlay"),
  fileLabel: document.getElementById("fileLabel"),
  statusLabel: document.getElementById("statusLabel"),
  textList: document.getElementById("textList"),
  addTextBtn: document.getElementById("addTextBtn"),
  sizeInput: document.getElementById("sizeInput"),
  sizeValue: document.getElementById("sizeValue"),
  colorInput: document.getElementById("colorInput"),
  opacityInput: document.getElementById("opacityInput"),
  opacityValue: document.getElementById("opacityValue"),
  outlineInput: document.getElementById("outlineInput"),
  singleOptions: document.getElementById("singleOptions"),
  patternOptions: document.getElementById("patternOptions"),
  positionSelect: document.getElementById("positionSelect"),
  spacingInput: document.getElementById("spacingInput"),
  spacingValue: document.getElementById("spacingValue"),
  angleInput: document.getElementById("angleInput"),
  angleValue: document.getElementById("angleValue"),
  videoOptions: document.getElementById("videoOptions"),
  speedField: document.getElementById("speedField"),
  speedInput: document.getElementById("speedInput"),
  speedValue: document.getElementById("speedValue"),
  motionHint: document.getElementById("motionHint"),
  progressWrap: document.getElementById("progressWrap"),
  progressBar: document.getElementById("progressBar"),
  progressLabel: document.getElementById("progressLabel"),
  settingsLabel: document.getElementById("settingsLabel"),
};

const DEFAULT_FONT = "system-ui, sans-serif";

function createSettings() {
  return {
    texts: ["SAMPLE"],
    fontFamily: DEFAULT_FONT,
    fontSize: 48,
    color: "#ffffff",
    opacity: 0.35,
    outline: true,
    layout: "pattern",
    position: "center",
    spacing: 120,
    angle: -28,
    motion: "static",
    bounceSpeed: 160,
  };
}

const state = {
  photos: [],
  videos: [],
  activeId: null,
  media: null,
  exporting: false,
  applyingForm: false,
  photoSettings: createSettings(),
  videoSettings: createSettings(),
  bounce: { x: 40, y: 40, vx: 2.4, vy: 1.8, box: { width: 80, height: 24 } },
};

function activeSettingsKind() {
  if (state.media?.kind === "video") return "video";
  if (state.media?.kind === "image") return "photo";
  if (state.videos.length && !state.photos.length) return "video";
  return "photo";
}

function rawSettings(kind) {
  return kind === "video" ? state.videoSettings : state.photoSettings;
}

function toDrawSettings(stored) {
  const cleaned = (stored.texts || []).map((value) => String(value || "").trim()).filter(Boolean);
  const texts = cleaned.length ? cleaned : ["WATERMARK"];
  return {
    texts,
    text: texts[0],
    fontFamily: stored.fontFamily,
    fontSize: stored.fontSize,
    color: stored.color,
    opacity: stored.opacity,
    outline: stored.outline,
    layout: stored.layout,
    position: stored.position,
    spacing: stored.spacing,
    angle: stored.angle,
    motion: stored.motion,
    bounceSpeed: stored.bounceSpeed,
  };
}

function getSettings(kind = activeSettingsKind()) {
  return toDrawSettings(rawSettings(kind));
}

function saveFormToSettings() {
  if (state.applyingForm) return;
  const target = rawSettings(activeSettingsKind());
  const texts = [...document.querySelectorAll("#textList input[type='text']")].map((input) => input.value);
  target.texts = texts.length ? texts : [""];
  target.fontSize = Number(els.sizeInput.value);
  target.color = els.colorInput.value;
  target.opacity = Number(els.opacityInput.value) / 100;
  target.outline = els.outlineInput.checked;
  target.layout = document.querySelector('input[name="layout"]:checked')?.value || "pattern";
  target.position = els.positionSelect.value;
  target.spacing = Number(els.spacingInput.value);
  target.angle = Number(els.angleInput.value);
  target.motion = document.querySelector('input[name="motion"]:checked')?.value || "static";
  target.bounceSpeed = Number(els.speedInput.value);
}

function loadSettingsToForm(kind = activeSettingsKind()) {
  const stored = rawSettings(kind);
  state.applyingForm = true;
  els.textList.innerHTML = "";
  const texts = stored.texts.length ? stored.texts : [""];
  texts.forEach((text) => {
    const row = document.createElement("div");
    row.className = "text-row";
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 120;
    input.value = text;
    input.setAttribute("aria-label", "Watermark text");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn text-remove";
    button.textContent = "Remove";
    row.append(input, button);
    els.textList.appendChild(row);
  });
  els.sizeInput.value = stored.fontSize;
  els.colorInput.value = stored.color;
  els.opacityInput.value = Math.round(stored.opacity * 100);
  els.outlineInput.checked = stored.outline;
  const layout = document.querySelector(`input[name="layout"][value="${stored.layout}"]`);
  if (layout) layout.checked = true;
  els.positionSelect.value = stored.position;
  els.spacingInput.value = stored.spacing;
  els.angleInput.value = stored.angle;
  const motion = document.querySelector(`input[name="motion"][value="${stored.motion}"]`);
  if (motion) motion.checked = true;
  els.speedInput.value = stored.bounceSpeed;
  updateTextRemoveButtons();
  refreshLabels();
  state.applyingForm = false;
}

function setStatus(text) {
  els.statusLabel.textContent = text || "";
}

function refreshLabels() {
  els.sizeValue.textContent = els.sizeInput.value;
  els.opacityValue.textContent = `${els.opacityInput.value}%`;
  els.spacingValue.textContent = els.spacingInput.value;
  els.angleValue.textContent = `${els.angleInput.value}°`;
  els.speedValue.textContent = els.speedInput.value;
}

function allItems() {
  return [...state.photos, ...state.videos];
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function syncModeUi() {
  saveFormToSettings();
  const settings = getSettings();
  const kind = activeSettingsKind();
  const isPattern = settings.layout === "pattern";
  const editingVideo = kind === "video";
  els.settingsLabel.textContent = editingVideo ? "Video watermark" : "Photo watermark";
  els.singleOptions.classList.toggle("hidden", isPattern);
  els.patternOptions.classList.toggle("hidden", !isPattern);
  els.videoOptions.classList.toggle("disabled", !editingVideo);
  const bounceAllowed = editingVideo && !isPattern;
  els.speedField.classList.toggle("hidden", !(bounceAllowed && settings.motion === "bounce"));
  if (!editingVideo) {
    els.motionHint.textContent = "Select a video to edit bounce. Photos use the settings above.";
  } else if (isPattern) {
    els.motionHint.textContent = "Repeat tiles on this video. Export records the clip in this tab.";
  } else {
    els.motionHint.textContent = "Bounce is one moving mark. Export records the clip in this tab.";
  }
  els.exportBtn.disabled = state.exporting || allItems().length === 0;
  updateNav();
  renderLists();
}

function currentList() {
  if (state.media?.kind === "video") return state.videos;
  if (state.media?.kind === "image") return state.photos;
  return [];
}

function updateNav() {
  const hasFiles = allItems().length > 0;
  els.emptyState.classList.toggle("hidden", hasFiles);
  const list = currentList();
  const index = list.findIndex((item) => item.id === state.activeId);
  const show = list.length > 1;
  els.prevBtn.classList.toggle("hidden", !show);
  els.nextBtn.classList.toggle("hidden", !show);
  if (index >= 0) {
    const kind = state.media.kind === "video" ? "Video" : "Photo";
    els.navLabel.textContent = `${kind} ${index + 1} of ${list.length}`;
  } else {
    els.navLabel.textContent = "";
  }
}

function stepPreview(delta) {
  const list = currentList();
  if (list.length < 2) return;
  const index = list.findIndex((item) => item.id === state.activeId);
  const next = list[(index + delta + list.length) % list.length];
  selectItem(next.id).catch((err) => setStatus(err.message));
}

function renderLists() {
  renderList(els.photoList, state.photos);
  renderList(els.videoList, state.videos);
}

function renderList(ul, items) {
  ul.innerHTML = items
    .map((item) => {
      const active = item.id === state.activeId ? "active" : "";
      const stClass = item.status === "Failed" ? "st err" : "st";
      return `<li class="${active}" data-id="${item.id}"><span class="name">${escapeHtml(item.name)}</span><span class="${stClass}">${escapeHtml(item.status || "Ready")}</span><button type="button" data-remove="${item.id}">Remove</button></li>`;
    })
    .join("");
}

function itemFromFile(file) {
  const name = file.name;
  const ext = (name.split(".").pop() || "").toLowerCase();
  const kind = IMAGE_EXTS.has(ext) ? "image" : "video";
  const url = URL.createObjectURL(file);
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    file,
    url,
    name,
    ext,
    kind,
    status: "Ready",
  };
}

function addFiles(files) {
  const items = [...files].map(itemFromFile);
  for (const item of items) {
    const list = item.kind === "video" ? state.videos : state.photos;
    if (list.some((existing) => existing.name === item.name && existing.file.size === item.file.size)) {
      URL.revokeObjectURL(item.url);
      continue;
    }
    list.push(item);
  }
  syncModeUi();
  const last = items[items.length - 1];
  if (last) selectItem(last.id).catch((err) => setStatus(err.message));
}

function removeItem(id) {
  const found = allItems().find((item) => item.id === id);
  if (found?.url) URL.revokeObjectURL(found.url);
  state.photos = state.photos.filter((item) => item.id !== id);
  state.videos = state.videos.filter((item) => item.id !== id);
  if (state.activeId === id) {
    const next = allItems()[0];
    if (next) selectItem(next.id).catch(() => {});
    else {
      state.activeId = null;
      state.media = null;
      clearPreview();
      els.emptyState.classList.remove("hidden");
      els.fileLabel.textContent = "No file";
      setStatus("");
    }
  }
  syncModeUi();
}

function clearPreview() {
  els.previewImage.classList.add("hidden");
  els.previewVideo.classList.add("hidden");
  els.previewVideo.pause();
  els.previewVideo.removeAttribute("src");
  els.previewVideo.load();
  els.previewImage.removeAttribute("src");
  resetStageSize();
}

async function selectItem(id) {
  const item = allItems().find((entry) => entry.id === id);
  if (!item) return;
  saveFormToSettings();
  const nextKind = item.kind === "video" ? "video" : "photo";
  state.activeId = id;
  state.media = item;
  clearPreview();
  els.emptyState.classList.add("hidden");
  els.fileLabel.textContent = item.name;
  loadSettingsToForm(nextKind);
  renderLists();
  if (item.kind === "video") {
    els.previewVideo.classList.remove("hidden");
    els.previewVideo.src = item.url;
    await new Promise((resolve, reject) => {
      els.previewVideo.onloadeddata = resolve;
      els.previewVideo.onerror = () => reject(new Error("Could not preview this video."));
    });
    els.previewVideo.play().catch(() => {});
    setStatus(`${els.previewVideo.videoWidth}×${els.previewVideo.videoHeight}`);
  } else {
    els.previewImage.classList.remove("hidden");
    els.previewImage.src = item.url;
    await new Promise((resolve, reject) => {
      els.previewImage.onload = resolve;
      els.previewImage.onerror = () => reject(new Error("Could not preview this image."));
    });
    setStatus(`${els.previewImage.naturalWidth}×${els.previewImage.naturalHeight}`);
  }
  syncModeUi();
  renderPreview();
}

function activeMediaEl() {
  if (!state.media) return null;
  return state.media.kind === "video" ? els.previewVideo : els.previewImage;
}

function resetStageSize() {
  els.stage.classList.remove("has-media");
  els.stage.style.width = "";
  els.stage.style.height = "";
}

function sizeStageToMedia(naturalW, naturalH) {
  const panel = els.stage.parentElement;
  const meta = panel.querySelector(".stage-meta");
  const topbar = document.querySelector(".topbar");
  const note = document.querySelector(".note");
  const chrome =
    (topbar?.offsetHeight || 0) +
    (note?.offsetHeight || 0) +
    (meta?.offsetHeight || 0) +
    24;
  const maxW = Math.max(160, panel.clientWidth);
  const maxH = Math.max(160, window.innerHeight - chrome);
  const scale = Math.min(maxW / naturalW, maxH / naturalH);
  els.stage.classList.add("has-media");
  els.stage.style.width = `${Math.round(naturalW * scale)}px`;
  els.stage.style.height = `${Math.round(naturalH * scale)}px`;
}

function displayedRect() {
  const media = activeMediaEl();
  if (!media) return null;
  const naturalW = state.media.kind === "video" ? media.videoWidth : media.naturalWidth;
  const naturalH = state.media.kind === "video" ? media.videoHeight : media.naturalHeight;
  if (!naturalW || !naturalH) return null;
  sizeStageToMedia(naturalW, naturalH);
  const stage = els.stage.getBoundingClientRect();
  const scale = Math.min(stage.width / naturalW, stage.height / naturalH);
  return {
    width: naturalW * scale,
    height: naturalH * scale,
    left: (stage.width - naturalW * scale) / 2,
    top: (stage.height - naturalH * scale) / 2,
    scale,
  };
}

function placeOverlay(rect) {
  const canvas = els.overlay;
  const dpr = window.devicePixelRatio || 1;
  canvas.style.left = `${rect.left}px`;
  canvas.style.top = `${rect.top}px`;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const media = activeMediaEl();
  if (media) {
    media.style.left = `${rect.left}px`;
    media.style.top = `${rect.top}px`;
    media.style.width = `${rect.width}px`;
    media.style.height = `${rect.height}px`;
  }
  return { ctx, width: rect.width, height: rect.height };
}

function previewMotion(width, height, settings, box) {
  if (!(state.media?.kind === "video" && settings.layout === "single" && settings.motion === "bounce")) {
    return { mode: "static" };
  }
  const maxX = Math.max(0, width - box.width);
  const maxY = Math.max(0, height - box.height);
  const speed = settings.bounceSpeed / 70;
  state.bounce.vx = Math.sign(state.bounce.vx || 1) * speed;
  state.bounce.vy = Math.sign(state.bounce.vy || 1) * speed * 0.72;
  state.bounce.x += state.bounce.vx;
  state.bounce.y += state.bounce.vy;
  if (state.bounce.x <= 0 || state.bounce.x >= maxX) {
    state.bounce.vx *= -1;
    state.bounce.x = Math.min(maxX, Math.max(0, state.bounce.x));
  }
  if (state.bounce.y <= 0 || state.bounce.y >= maxY) {
    state.bounce.vy *= -1;
    state.bounce.y = Math.min(maxY, Math.max(0, state.bounce.y));
  }
  return { mode: "bounce", x: state.bounce.x, y: state.bounce.y };
}

function renderPreview() {
  if (!state.media) return;
  const rect = displayedRect();
  if (!rect) return;
  const settings = getSettings();
  const previewSettings = {
    ...settings,
    fontSize: settings.fontSize * rect.scale,
    spacing: settings.spacing * rect.scale,
  };
  const placed = placeOverlay(rect);
  placed.ctx.clearRect(0, 0, placed.width, placed.height);
  const box = measureText(placed.ctx, previewSettings.text, previewSettings);
  const motion = previewMotion(placed.width, placed.height, settings, box);
  drawWatermark(placed.ctx, placed.width, placed.height, previewSettings, motion);
}

function loop() {
  renderPreview();
  requestAnimationFrame(loop);
}

function fileNameWithSuffix(name, suffix) {
  const base = name.replace(/\.[^.]+$/, "");
  return `${base}${suffix}`;
}

function uniqueName(name, used) {
  let candidate = name;
  let i = 2;
  while (used.has(candidate.toLowerCase())) {
    const match = name.match(/^(.*)(\.[^.]+)$/);
    candidate = match ? `${match[1]}-${i}${match[2]}` : `${name}-${i}`;
    i += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u16(n) {
  return new Uint8Array([n & 255, (n >>> 8) & 255]);
}

function u32(n) {
  return new Uint8Array([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]);
}

async function zipBlobs(files) {
  const enc = new TextEncoder();
  const parts = [];
  const centrals = [];
  let offset = 0;
  for (const file of files) {
    const name = enc.encode(file.name.replace(/\\/g, "/"));
    const data = new Uint8Array(await file.blob.arrayBuffer());
    const crc = crc32(data);
    const local = [
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name,
      data,
    ];
    const localSize = 30 + name.length + data.length;
    centrals.push(
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name
    );
    parts.push(...local);
    offset += localSize;
  }
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  parts.push(
    ...centrals,
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralSize),
    u32(offset),
    u16(0)
  );
  return new Blob(parts, { type: "application/zip" });
}

const heldDownloads = [];

function ensureDownloadFrame() {
  let frame = document.getElementById("downloadFrame");
  if (frame) return frame;
  frame = document.createElement("iframe");
  frame.id = "downloadFrame";
  frame.name = "downloadFrame";
  frame.setAttribute("hidden", "");
  frame.style.display = "none";
  document.body.appendChild(frame);
  return frame;
}

async function downloadBlob(blob, filename) {
  ensureDownloadFrame();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.target = "downloadFrame";
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  heldDownloads.push({ a, url });
  await sleep(1000);
}

function releaseDownloads() {
  window.setTimeout(() => {
    for (const item of heldDownloads) {
      item.a.remove();
      URL.revokeObjectURL(item.url);
    }
    heldDownloads.length = 0;
  }, 12000);
}

async function encodePhoto(item, settings, usedNames) {
  item.status = "Working";
  renderLists();
  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    let settled = false;
    const ok = () => {
      if (settled) return;
      settled = true;
      resolve(image);
    };
    const bad = () => {
      if (settled) return;
      settled = true;
      reject(new Error("Could not read image."));
    };
    image.onload = ok;
    image.onerror = bad;
    image.src = item.url;
    if (image.complete && image.naturalWidth) ok();
  });
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d", { alpha: true });
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  drawWatermark(ctx, canvas.width, canvas.height, settings, { mode: "static" });
  const jpeg = ["jpg", "jpeg"].includes(item.ext);
  const mime = jpeg ? "image/jpeg" : "image/png";
  const buffer = await canvasBuffer(canvas, mime, jpeg ? 0.98 : undefined);
  const blob = new Blob([buffer], { type: mime });
  const outName = uniqueName(fileNameWithSuffix(item.name, jpeg ? "_watermarked.jpg" : "_watermarked.png"), usedNames);
  return { blob, name: outName };
}

function pickRecorderMime() {
  if (typeof MediaRecorder === "undefined") return "";
  const types = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function bounceAtTime(t, speed, width, height, box) {
  const vx = Math.max(40, Number(speed) || 160);
  const vy = Math.round(vx * 0.72);
  const maxX = Math.max(1, width - box.width);
  const maxY = Math.max(1, height - box.height);
  return {
    mode: "bounce",
    x: Math.abs(((t * vx) % (2 * maxX)) - maxX),
    y: Math.abs(((t * vy) % (2 * maxY)) - maxY),
  };
}

function waitMedia(el, eventName) {
  return new Promise((resolve, reject) => {
    const ok = () => {
      el.removeEventListener(eventName, ok);
      el.removeEventListener("error", bad);
      resolve();
    };
    const bad = () => {
      el.removeEventListener(eventName, ok);
      el.removeEventListener("error", bad);
      reject(new Error("Could not read video."));
    };
    el.addEventListener(eventName, ok);
    el.addEventListener("error", bad);
  });
}

async function exportVideoItem(item, settings, usedNames) {
  if (typeof MediaRecorder === "undefined" || typeof HTMLCanvasElement.prototype.captureStream !== "function") {
    throw new Error("This browser cannot record video in the page.");
  }
  item.status = "Working";
  renderLists();

  const video = document.createElement("video");
  video.playsInline = true;
  video.muted = true;
  video.preload = "auto";
  video.src = item.url;
  await waitMedia(video, "loadeddata");
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) throw new Error("Video has no size.");

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  const canvasStream = canvas.captureStream(30);
  try {
    const grab = video.captureStream || video.mozCaptureStream;
    if (grab) {
      grab.call(video).getAudioTracks().forEach((track) => canvasStream.addTrack(track));
    }
  } catch {
    // silent video is fine
  }

  const mime = pickRecorderMime();
  const rec = mime
    ? new MediaRecorder(canvasStream, { mimeType: mime, videoBitsPerSecond: 8000000 })
    : new MediaRecorder(canvasStream);
  const chunks = [];
  rec.addEventListener("dataavailable", (event) => {
    if (event.data && event.data.size) chunks.push(event.data);
  });
  const stopped = new Promise((resolve, reject) => {
    rec.addEventListener("stop", resolve);
    rec.addEventListener("error", () => reject(new Error("Could not record this video.")));
  });

  let drawing = true;
  const drawFrame = () => {
    if (!drawing) return;
    ctx.drawImage(video, 0, 0, width, height);
    let motion = { mode: "static" };
    if (settings.layout === "single" && settings.motion === "bounce") {
      const text = watermarkTexts(settings)[0];
      const box = measureText(ctx, text, settings);
      motion = bounceAtTime(video.currentTime, settings.bounceSpeed, width, height, box);
    }
    drawWatermark(ctx, width, height, settings, motion);
    if (video.duration) {
      const pct = Math.min(99, (video.currentTime / video.duration) * 100);
      els.progressBar.style.width = `${Math.max(8, pct)}%`;
      els.progressLabel.textContent = `${item.name} ${Math.round(pct)}%`;
    }
    if (!video.ended) requestAnimationFrame(drawFrame);
  };

  rec.start(250);
  await video.play();
  drawFrame();
  await new Promise((resolve) => {
    video.addEventListener("ended", resolve, { once: true });
  });
  drawing = false;
  ctx.drawImage(video, 0, 0, width, height);
  drawWatermark(
    ctx,
    width,
    height,
    settings,
    settings.layout === "single" && settings.motion === "bounce"
      ? bounceAtTime(video.duration || video.currentTime, settings.bounceSpeed, width, height, measureText(ctx, watermarkTexts(settings)[0], settings))
      : { mode: "static" }
  );
  rec.stop();
  await stopped;
  canvasStream.getTracks().forEach((track) => track.stop());
  video.pause();
  video.removeAttribute("src");
  video.load();

  const type = rec.mimeType || mime || "video/webm";
  const blob = new Blob(chunks, { type });
  if (!blob.size) throw new Error("Recording came out empty.");
  const suffix = type.includes("mp4") ? "_watermarked.mp4" : "_watermarked.webm";
  const outName = uniqueName(fileNameWithSuffix(item.name, suffix), usedNames);
  return { blob, name: outName };
}

async function exportAll() {
  if (state.exporting) return;
  const photos = state.photos.slice();
  const videos = state.videos.slice();
  const total = photos.length + videos.length;
  if (!total) return;

  state.exporting = true;
  const photoSettings = getSettings("photo");
  const videoSettings = getSettings("video");
  const usedNames = new Set();
  const packed = [];
  let done = 0;
  let saved = 0;
  els.exportBtn.disabled = true;
  els.progressWrap.classList.remove("hidden");
  els.progressBar.style.width = "4%";
  els.progressLabel.textContent = `0/${total}`;
  setStatus(`Exporting ${total} files`);

  const markProgress = () => {
    els.progressBar.style.width = `${Math.max(8, (done / total) * 100)}%`;
    els.progressLabel.textContent = `${done}/${total}`;
    setStatus(`saved ${saved}/${total}`);
  };

  try {
    for (let i = 0; i < photos.length; i += 1) {
      const item = photos[i];
      els.progressLabel.textContent = `${done + 1}/${total}`;
      try {
        packed.push(await encodePhoto(item, photoSettings, usedNames));
        item.status = "Saved";
        saved += 1;
        renderLists();
      } catch (error) {
        item.status = "Failed";
        item.error = error.message;
        renderLists();
        setStatus(error.message);
      }
      done += 1;
      markProgress();
    }

    for (let i = 0; i < videos.length; i += 1) {
      const item = videos[i];
      els.progressLabel.textContent = `${done + 1}/${total}`;
      try {
        packed.push(await exportVideoItem(item, videoSettings, usedNames));
        item.status = "Saved";
        saved += 1;
        renderLists();
      } catch (error) {
        item.status = "Failed";
        item.error = error.message;
        renderLists();
        setStatus(error.message);
      }
      done += 1;
      markProgress();
    }

    if (packed.length > 1) {
      const zip = await zipBlobs(packed);
      await downloadBlob(zip, "watermarked.zip");
    }
    for (let i = 0; i < packed.length; i += 1) {
      els.progressLabel.textContent = `${i + 1}/${packed.length}`;
      await downloadBlob(packed[i].blob, packed[i].name);
    }

    els.progressBar.style.width = "100%";
    els.progressLabel.textContent = `${saved}/${total}`;
    setStatus(`saved ${saved}/${total}`);
  } finally {
    releaseDownloads();
    state.exporting = false;
    syncModeUi();
  }
}

function bindListClicks(ul) {
  ul.addEventListener("click", (event) => {
    const removeId = event.target.getAttribute("data-remove");
    if (removeId) {
      event.stopPropagation();
      removeItem(removeId);
      return;
    }
    const row = event.target.closest("li");
    if (row?.dataset.id) selectItem(row.dataset.id).catch((err) => setStatus(err.message));
  });
}

function updateTextRemoveButtons() {
  const rows = [...els.textList.querySelectorAll(".text-row")];
  rows.forEach((row) => {
    const button = row.querySelector(".text-remove");
    if (button) button.disabled = rows.length <= 1;
  });
}

function bind() {
  els.addPhotosBtn.addEventListener("click", () => els.photoInput.click());
  els.addVideosBtn.addEventListener("click", () => els.videoInput.click());
  els.photoInput.addEventListener("change", () => {
    if (els.photoInput.files.length) addFiles(els.photoInput.files);
    els.photoInput.value = "";
  });
  els.videoInput.addEventListener("change", () => {
    if (els.videoInput.files.length) addFiles(els.videoInput.files);
    els.videoInput.value = "";
  });
  els.exportBtn.addEventListener("click", () => exportAll());
  bindListClicks(els.photoList);
  bindListClicks(els.videoList);
  els.addTextBtn.addEventListener("click", () => {
    const row = document.createElement("div");
    row.className = "text-row";
    row.innerHTML =
      '<input type="text" maxlength="120" value="" aria-label="Watermark text" /><button type="button" class="btn text-remove">Remove</button>';
    els.textList.appendChild(row);
    row.querySelector("input").focus();
    updateTextRemoveButtons();
    saveFormToSettings();
    syncModeUi();
  });
  els.textList.addEventListener("click", (event) => {
    if (!event.target.classList.contains("text-remove")) return;
    const rows = els.textList.querySelectorAll(".text-row");
    if (rows.length <= 1) return;
    event.target.closest(".text-row")?.remove();
    updateTextRemoveButtons();
    saveFormToSettings();
    syncModeUi();
  });
  els.textList.addEventListener("input", () => {
    saveFormToSettings();
    syncModeUi();
  });
  [
    els.sizeInput,
    els.colorInput,
    els.opacityInput,
    els.outlineInput,
    els.positionSelect,
    els.spacingInput,
    els.angleInput,
    els.speedInput,
  ].forEach((el) => {
    el.addEventListener("input", () => {
      refreshLabels();
      saveFormToSettings();
      syncModeUi();
    });
    el.addEventListener("change", () => {
      refreshLabels();
      saveFormToSettings();
      syncModeUi();
    });
  });
  document.querySelectorAll('input[name="layout"], input[name="motion"]').forEach((el) => {
    el.addEventListener("change", () => {
      if (el.value === "bounce") {
        document.querySelector('input[name="layout"][value="single"]').checked = true;
      }
      if (el.name === "layout" && el.value === "pattern") {
        document.querySelector('input[name="motion"][value="static"]').checked = true;
      }
      saveFormToSettings();
      syncModeUi();
    });
  });
  ["dragenter", "dragover"].forEach((evt) => {
    els.filePanel.addEventListener(evt, (e) => {
      e.preventDefault();
      els.filePanel.classList.add("drag");
    });
  });
  ["dragleave", "drop"].forEach((evt) => {
    els.filePanel.addEventListener(evt, (e) => {
      e.preventDefault();
      els.filePanel.classList.remove("drag");
    });
  });
  els.filePanel.addEventListener("drop", (e) => {
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  });
  els.prevBtn.addEventListener("click", () => stepPreview(-1));
  els.nextBtn.addEventListener("click", () => stepPreview(1));
  window.addEventListener("keydown", (event) => {
    if (event.target.matches("input, textarea, select")) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      stepPreview(-1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      stepPreview(1);
    }
  });
  window.addEventListener("resize", renderPreview);
}

refreshLabels();
updateTextRemoveButtons();
loadSettingsToForm("photo");
syncModeUi();
bind();
requestAnimationFrame(loop);
