function hexToRgba(hex, alpha) {
  const raw = hex.replace("#", "");
  const value = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const num = parseInt(value, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function fontSpec(size, family) {
  return `${size}px ${family}`;
}

function measureText(ctx, text, settings) {
  ctx.save();
  ctx.font = fontSpec(settings.fontSize, settings.fontFamily);
  const metrics = ctx.measureText(text || " ");
  ctx.restore();
  const width = Math.max(1, metrics.width);
  const height = Math.max(
    settings.fontSize,
    (metrics.actualBoundingBoxAscent || settings.fontSize * 0.8) +
      (metrics.actualBoundingBoxDescent || settings.fontSize * 0.2)
  );
  return { width, height };
}

function paintText(ctx, text, x, y, settings) {
  ctx.font = fontSpec(settings.fontSize, settings.fontFamily);
  ctx.fillStyle = hexToRgba(settings.color, settings.opacity);
  ctx.textBaseline = "top";
  if (settings.outline) {
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    ctx.lineWidth = Math.max(2, settings.fontSize / 18);
    ctx.strokeStyle = `rgba(0, 0, 0, ${Math.min(0.75, settings.opacity + 0.2)})`;
    ctx.strokeText(text, x, y);
  }
  ctx.fillText(text, x, y);
}

function staticPosition(width, height, box, position, pad = 40) {
  const map = {
    "top-left": { x: pad, y: pad },
    "top-right": { x: width - box.width - pad, y: pad },
    "bottom-left": { x: pad, y: height - box.height - pad },
    center: {
      x: (width - box.width) / 2,
      y: (height - box.height) / 2,
    },
  };
  const fallback = {
    x: width - box.width - pad,
    y: height - box.height - pad,
  };
  const chosen = map[position] || fallback;
  return {
    x: Math.max(0, chosen.x),
    y: Math.max(0, chosen.y),
  };
}

function watermarkTexts(settings) {
  const list = Array.isArray(settings.texts) ? settings.texts : [settings.text];
  const cleaned = list.map((value) => String(value || "").trim()).filter(Boolean);
  return cleaned.length ? cleaned : ["WATERMARK"];
}

function drawPattern(ctx, width, height, settings) {
  const text = settings.text || " ";
  const box = measureText(ctx, text, settings);
  const gap = settings.spacing;
  const stepX = box.width + gap;
  const stepY = box.height + gap * 0.7;
  const diag = Math.hypot(width, height);

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate((settings.angle * Math.PI) / 180);
  ctx.translate(-width / 2, -height / 2);

  for (let y = -diag; y < height + diag; y += stepY) {
    for (let x = -diag; x < width + diag; x += stepX) {
      paintText(ctx, text, x, y, settings);
    }
  }
  ctx.restore();
}

function drawSingle(ctx, width, height, settings, motion) {
  const text = settings.text || " ";
  const box = measureText(ctx, text, settings);
  let x;
  let y;
  if (motion && motion.mode === "bounce") {
    x = motion.x;
    y = motion.y;
  } else {
    const pos = staticPosition(width, height, box, settings.position);
    x = pos.x;
    y = pos.y;
  }
  paintText(ctx, text, x, y, settings);
  return box;
}

function drawWatermark(ctx, width, height, settings, motion) {
  const texts = watermarkTexts(settings);
  if (settings.layout === "pattern") {
    texts.forEach((text, index) => {
      const layer = { ...settings, text };
      ctx.save();
      const shift = (Number(settings.spacing) || 120) * 0.32 * index;
      ctx.translate(shift, shift * 0.55);
      drawPattern(ctx, width, height, layer);
      ctx.restore();
    });
    return null;
  }
  if (motion && motion.mode === "bounce") {
    return drawSingle(ctx, width, height, { ...settings, text: texts[0] }, motion);
  }
  let lastBox = null;
  texts.forEach((text, index) => {
    const layer = { ...settings, text };
    const box = measureText(ctx, text, layer);
    const pos = staticPosition(width, height, box, settings.position);
    paintText(ctx, text, pos.x, pos.y + index * (box.height + 8), layer);
    lastBox = box;
  });
  return lastBox;
}

function createOverlayCanvas(width, height, settings, motion) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d");
  drawWatermark(ctx, canvas.width, canvas.height, settings, motion);
  return canvas;
}

function createTextStampCanvas(settings) {
  const text = watermarkTexts(settings)[0];
  const probe = document.createElement("canvas").getContext("2d");
  const box = measureText(probe, text, settings);
  const pad = Math.ceil(Math.max(4, settings.fontSize / 10));
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(box.width) + pad * 2;
  canvas.height = Math.ceil(box.height) + pad * 2;
  const ctx = canvas.getContext("2d");
  paintText(ctx, text, pad, pad, settings);
  return canvas;
}

async function canvasBuffer(canvas, mime = "image/png", quality) {
  const blob = await new Promise((resolve, reject) => {
    try {
      canvas.toBlob((result) => {
        if (!result) {
          reject(new Error("Could not encode this image. It may be too large for memory."));
          return;
        }
        resolve(result);
      }, mime, quality);
    } catch (error) {
      reject(error);
    }
  });
  return blob.arrayBuffer();
}

async function canvasPngBuffer(canvas) {
  return canvasBuffer(canvas, "image/png");
}
