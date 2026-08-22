const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "webp", "bmp", "gif", "tif", "tiff"]);

const els = {
  exportBtn: document.getElementById("exportBtn"),
  addPhotosBtn: document.getElementById("addPhotosBtn"),
  addVideosBtn: document.getElementById("addVideosBtn"),
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

const DEFAULT_FONT = '"Segoe UI", sans-serif';

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
  videoInfo: null,
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
  els.motionHint.textContent = isPattern
    ? "Repeat tiles every line on this video. Bounce is one moving mark."
    : "Bounce slides the first text around the frame.";
  if (!editingVideo) {
    els.motionHint.textContent = "Select a video to edit bounce. Photos use the settings above.";
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
      const safeName = escapeHtml(item.name);
      const safeStatus = escapeHtml(item.status || "Ready");
      return `<li class="${active}" data-id="${item.id}"><span class="name" title="${safeName}">${safeName}</span><span class="${stClass}">${safeStatus}</span><button type="button" data-remove="${item.id}">Remove</button></li>`;
    })
    .join("");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function mediaFromPath(filePath) {
  const name = filePath.split(/[/\\]/).pop();
  const ext = (name.split(".").pop() || "").toLowerCase();
  const kind = IMAGE_EXTS.has(ext) ? "image" : "video";
  const url = `file:///${filePath.replace(/\\/g, "/")}`;
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    path: filePath,
    url,
    name,
    ext,
    kind,
    status: "Ready",
  };
}

function addItems(items) {
  for (const item of items) {
    const list = item.kind === "video" ? state.videos : state.photos;
    if (list.some((existing) => existing.path === item.path)) continue;
    list.push(item);
  }
  syncModeUi();
  const last = items[items.length - 1];
  if (last) selectItem(last.id).catch((err) => setStatus(err.message));
}

function removeItem(id) {
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
  state.videoInfo = null;
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
    state.videoInfo = await window.watermarkApi.probeVideo(item.path);
    setStatus(`${state.videoInfo.width}×${state.videoInfo.height}`);
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
  const width = naturalW * scale;
  const height = naturalH * scale;
  return {
    width,
    height,
    left: (stage.width - width) / 2,
    top: (stage.height - height) / 2,
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
  state.bounce.box = box;
  const motion = previewMotion(placed.width, placed.height, settings, box);
  drawWatermark(placed.ctx, placed.width, placed.height, previewSettings, motion);
}

function loop() {
  renderPreview();
  requestAnimationFrame(loop);
}

async function addFromDialog(kind) {
  const items = await window.watermarkApi.openMedia(kind);
  if (items?.length) addItems(items.map((item) => ({ ...item, id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, status: "Ready" })));
}

function loadHtmlImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let settled = false;
    const ok = () => {
      if (settled) return;
      settled = true;
      resolve(img);
    };
    const bad = () => {
      if (settled) return;
      settled = true;
      reject(new Error("Could not read image."));
    };
    img.onload = ok;
    img.onerror = bad;
    img.src = url;
    if (img.complete && img.naturalWidth) ok();
  });
}

async function imageForItem(item) {
  if (item.path) {
    const raw = await window.watermarkApi.readFile(item.path);
    const bytes = raw instanceof ArrayBuffer ? raw : raw?.data ? new Uint8Array(raw.data) : raw;
    const url = URL.createObjectURL(new Blob([bytes]));
    try {
      return await loadHtmlImage(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  return loadHtmlImage(item.url);
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

function suggestedOutName(item) {
  if (item.kind === "video") return fileNameWithSuffix(item.name, "_watermarked.mp4");
  const jpeg = ["jpg", "jpeg"].includes(item.ext);
  return fileNameWithSuffix(item.name, jpeg ? "_watermarked.jpg" : "_watermarked.png");
}

async function exportPhoto(item, settings, usedNames) {
  item.status = "Working";
  renderLists();
  const img = await imageForItem(item);
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  if (!width || !height) throw new Error("Image has no size.");
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("Could not create a drawing surface.");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, width, height);
  drawWatermark(ctx, width, height, settings, { mode: "static" });
  const jpeg = ["jpg", "jpeg"].includes(item.ext);
  const buffer = await canvasBuffer(canvas, jpeg ? "image/jpeg" : "image/png", jpeg ? 0.98 : undefined);
  const outName = uniqueName(suggestedOutName(item), usedNames);
  const outPath = await window.watermarkApi.saveToDownloads(outName, new Uint8Array(buffer));
  item.status = "Saved";
  item.outPath = outPath;
  renderLists();
}

async function exportVideoItem(item, settings, usedNames) {
  item.status = "Working";
  renderLists();
  if (!item.path) throw new Error("This video has no file path to export.");
  const info = await window.watermarkApi.probeVideo(item.path);
  const bounce = settings.layout === "single" && settings.motion === "bounce";
  const overlayCanvas =
    settings.layout === "pattern"
      ? createOverlayCanvas(info.width, info.height, settings, { mode: "static" })
      : createTextStampCanvas(settings);
  const overlayPng = new Uint8Array(await canvasPngBuffer(overlayCanvas));
  if (overlayPng.length < 32) throw new Error("Could not build the watermark overlay.");
  const outName = uniqueName(suggestedOutName(item), usedNames);
  const outPath = await window.watermarkApi.uniqueDownloadPath(outName);
  const stop = window.watermarkApi.onVideoProgress((payload) => {
    if (payload.outTimeMs && info.duration) {
      const pct = Math.min(99, (payload.outTimeMs / (info.duration * 1000)) * 100);
      els.progressBar.style.width = `${Math.max(8, pct)}%`;
      els.progressLabel.textContent = `${item.name} ${Math.round(pct)}%`;
    }
  });
  try {
    await window.watermarkApi.exportVideo({
      inputPath: item.path,
      outputPath: outPath,
      overlayPng,
      layout: settings.layout,
      motion: bounce ? "bounce" : "static",
      position: settings.position,
      bounceSpeed: settings.bounceSpeed,
      hasAudio: Boolean(info.hasAudio),
    });
  } catch (error) {
    throw new Error(error?.message || "Video export failed.");
  } finally {
    stop();
  }
  item.status = "Saved";
  item.outPath = outPath;
  renderLists();
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
        await exportPhoto(item, photoSettings, usedNames);
        saved += 1;
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
        await exportVideoItem(item, videoSettings, usedNames);
        saved += 1;
      } catch (error) {
        item.status = "Failed";
        item.error = error.message;
        renderLists();
        setStatus(error.message);
      }
      done += 1;
      markProgress();
    }

    els.progressBar.style.width = "100%";
    els.progressLabel.textContent = `${saved}/${total}`;
    setStatus(`saved ${saved}/${total}`);
    const lastSaved = [...photos, ...videos].reverse().find((item) => item.outPath);
    if (lastSaved) await window.watermarkApi.showItem(lastSaved.outPath);
  } finally {
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
  els.addPhotosBtn.addEventListener("click", () => addFromDialog("image").catch((err) => setStatus(err.message)));
  els.addVideosBtn.addEventListener("click", () => addFromDialog("video").catch((err) => setStatus(err.message)));
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
  els.filePanel.addEventListener("drop", async (e) => {
    const files = [...e.dataTransfer.files];
    if (!files.length) return;
    try {
      const items = [];
      for (const file of files) {
        const filePath = window.watermarkApi.pathForFile(file);
        const described = await window.watermarkApi.fromPath(filePath);
        items.push({
          ...described,
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}-${items.length}`,
          status: "Ready",
        });
      }
      addItems(items);
    } catch (error) {
      setStatus(error.message);
    }
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
