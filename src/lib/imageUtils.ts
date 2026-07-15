/**
 * Convert an image URL to a base64 data URL
 */
export async function imageUrlToBase64(imageUrl: string): Promise<string> {
  // If it's already a data URL, return as-is
  if (imageUrl.startsWith('data:')) {
    return imageUrl;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      
      // Convert to base64 JPEG for smaller size
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      resolve(dataUrl);
    };
    
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${imageUrl}`));
    };
    
    img.src = imageUrl;
  });
}

/**
 * Normalize any uploaded/pasted image (including SVG, GIF, BMP, HEIC fallbacks)
 * into a safe rasterized PNG data URL. The AI gateway rejects vector formats
 * like image/svg+xml, so we always rasterize before sending.
 */
export function normalizeToRasterImage(
  dataUrl: string,
  maxDimension = 2400
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Already a safe raster type? Pass through.
    if (/^data:image\/(png|jpeg|jpg|webp);/i.test(dataUrl)) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let w = img.naturalWidth || 1024;
      let h = img.naturalHeight || 1024;
      if (w > maxDimension || h > maxDimension) {
        const ratio = Math.min(maxDimension / w, maxDimension / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to rasterize image'));
    img.src = dataUrl;
  });
}

/**
 * Compress/resize an image to reduce payload size for API calls.
 * Keeps aspect ratio, caps at maxDimension, uses JPEG quality.
 */
export function compressImage(
  dataUrl: string,
  maxDimension = 1200,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { naturalWidth: w, naturalHeight: h } = img;

      // Scale down if needed
      if (w > maxDimension || h > maxDimension) {
        const ratio = Math.min(maxDimension / w, maxDimension / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Failed to compress image'));
    img.src = dataUrl;
  });
}

/**
 * Resize an image while preserving real transparency for isolated furniture PNGs.
 * Unlike compressImage, this never converts transparent areas to black/white JPEG pixels.
 */
export function resizeTransparentPng(
  dataUrl: string,
  maxDimension = 1600
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let { naturalWidth: w, naturalHeight: h } = img;

      if (w > maxDimension || h > maxDimension) {
        const ratio = Math.min(maxDimension / w, maxDimension / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to resize transparent image'));
    img.src = dataUrl;
  });
}

/**
 * Flatten a (possibly transparent) image onto a solid white background.
 * Returns a PNG data URL with no transparency.
 */
export function flattenToWhiteBackground(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to flatten image onto white background'));
    img.src = dataUrl;
  });
}

/**
 * Tightly crop a (mostly white-background) furniture image to the furniture
 * silhouette and re-place it on a clean white canvas with only a small
 * margin so the furniture fills the frame instead of floating in a sea of
 * white. Does not alter the furniture pixels themselves.
 *
 * - whiteThreshold: pixels brighter than this (per channel) AND with alpha
 *   ~opaque are treated as background.
 * - marginRatio: fraction of the cropped longest side to keep as white
 *   margin around the furniture (e.g. 0.04 = 4%).
 */
export function tightCropToWhiteCanvas(
  dataUrl: string,
  whiteThreshold = 245,
  marginRatio = 0.04
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const src = document.createElement('canvas');
      src.width = w;
      src.height = h;
      const sctx = src.getContext('2d');
      if (!sctx) { reject(new Error('Failed to get canvas context')); return; }
      sctx.fillStyle = '#ffffff';
      sctx.fillRect(0, 0, w, h);
      sctx.drawImage(img, 0, 0, w, h);
      let data: Uint8ClampedArray;
      try {
        data = sctx.getImageData(0, 0, w, h).data;
      } catch (e) {
        // CORS or other read failure — fall back to original image.
        resolve(dataUrl);
        return;
      }

      let minX = w, minY = h, maxX = -1, maxY = -1;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          // Non-white pixel = part of furniture
          if (r < whiteThreshold || g < whiteThreshold || b < whiteThreshold) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }

      // No furniture detected — return original.
      if (maxX < 0 || maxY < 0 || maxX <= minX || maxY <= minY) {
        resolve(dataUrl);
        return;
      }

      const cropW = maxX - minX + 1;
      const cropH = maxY - minY + 1;
      const margin = Math.round(Math.max(cropW, cropH) * marginRatio);
      const outW = cropW + margin * 2;
      const outH = cropH + margin * 2;

      const out = document.createElement('canvas');
      out.width = outW;
      out.height = outH;
      const octx = out.getContext('2d');
      if (!octx) { reject(new Error('Failed to get canvas context')); return; }
      octx.imageSmoothingEnabled = true;
      octx.imageSmoothingQuality = 'high';
      octx.fillStyle = '#ffffff';
      octx.fillRect(0, 0, outW, outH);
      octx.drawImage(src, minX, minY, cropW, cropH, margin, margin, cropW, cropH);
      resolve(out.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to tight-crop image'));
    img.src = dataUrl;
  });
}

/**
 * Force edge-connected non-furniture background pixels to pure white.
 * This is a deterministic fallback for AI outputs that return a tinted wall,
 * floor, gradient, or other generated background instead of #ffffff.
 */
export function forceEdgeBackgroundToWhite(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Failed to get canvas context')); return; }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      let imageData: ImageData;
      try {
        imageData = ctx.getImageData(0, 0, w, h);
      } catch {
        resolve(dataUrl);
        return;
      }

      const data = imageData.data;
      const visited = new Uint8Array(w * h);
      const queue: number[] = [];
      const enqueue = (x: number, y: number) => {
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        const idx = y * w + x;
        if (visited[idx]) return;
        visited[idx] = 1;
        queue.push(idx);
      };

      for (let x = 0; x < w; x++) {
        enqueue(x, 0);
        enqueue(x, h - 1);
      }
      for (let y = 0; y < h; y++) {
        enqueue(0, y);
        enqueue(w - 1, y);
      }

      const isLikelyBackground = (idx: number) => {
        const i = idx * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        if (a < 24) return true;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max - min;
        const brightness = (r + g + b) / 3;

        // White / off-white / light gray generated backgrounds.
        if (brightness >= 188 && saturation <= 58) return true;
        // Muted studio-wall or floor tints, but avoid strong/dark furniture pixels.
        if (brightness >= 132 && saturation <= 34) return true;
        // Already white enough.
        if (r >= 245 && g >= 245 && b >= 245) return true;
        return false;
      };

      while (queue.length) {
        const idx = queue.shift()!;
        if (!isLikelyBackground(idx)) continue;

        const i = idx * 4;
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = 255;

        const x = idx % w;
        const y = Math.floor(idx / w);
        enqueue(x + 1, y);
        enqueue(x - 1, y);
        enqueue(x, y + 1);
        enqueue(x, y - 1);
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to force white background'));
    img.src = dataUrl;
  });
}

export interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
  orientation: "landscape" | "portrait" | "square";
}

export function getImageDimensions(dataUrl: string): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      resolve({
        width,
        height,
        aspectRatio: width / height,
        orientation: width > height ? "landscape" : width < height ? "portrait" : "square",
      });
    };
    img.onerror = () => reject(new Error('Failed to read image dimensions'));
    img.src = dataUrl;
  });
}

/**
 * Place an image on a transparent canvas matching the source aspect ratio,
 * WITHOUT downscaling the AI-generated image. The canvas is sized from the
 * larger of (source dims, image natural dims) so high-quality outputs are
 * preserved. Only enforces aspect ratio so wide buffet outputs stay landscape.
 */
export function containImageInTransparentCanvas(
  dataUrl: string,
  targetWidth: number,
  targetHeight: number,
  maxDimension = 3200,
  backgroundFill: string | null = null
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const targetAspect = targetWidth / targetHeight;
      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;

      // Base the canvas on whichever dimensions are larger so we never
      // downscale the AI output. Build a canvas that matches the source
      // aspect ratio and fully contains the image at native resolution.
      const baseLong = Math.max(imgW, imgH, targetWidth, targetHeight);

      let canvasWidth: number;
      let canvasHeight: number;
      if (targetAspect >= 1) {
        canvasWidth = baseLong;
        canvasHeight = Math.round(baseLong / targetAspect);
      } else {
        canvasHeight = baseLong;
        canvasWidth = Math.round(baseLong * targetAspect);
      }

      // Ensure the image still fits — if not, grow the canvas (don't shrink image).
      if (imgW > canvasWidth || imgH > canvasHeight) {
        const growW = imgW / canvasWidth;
        const growH = imgH / canvasHeight;
        const grow = Math.max(growW, growH);
        canvasWidth = Math.round(canvasWidth * grow);
        canvasHeight = Math.round(canvasHeight * grow);
      }

      // Cap only if both dimensions exceed the max (rare).
      const longest = Math.max(canvasWidth, canvasHeight);
      if (longest > maxDimension) {
        const scale = maxDimension / longest;
        canvasWidth = Math.round(canvasWidth * scale);
        canvasHeight = Math.round(canvasHeight * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Default: leave the canvas fully transparent so the furniture can be
      // copied/pasted into Excel or other documents with no background.
      // Pass a CSS color (e.g. '#ffffff') to flatten onto a solid fill.
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      if (backgroundFill) {
        ctx.fillStyle = backgroundFill;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }
      const scale = Math.min(canvasWidth / imgW, canvasHeight / imgH);
      const drawWidth = Math.round(imgW * scale);
      const drawHeight = Math.round(imgH * scale);
      const dx = Math.round((canvasWidth - drawWidth) / 2);
      const dy = Math.round((canvasHeight - drawHeight) / 2);
      ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to fit image to transparent canvas'));
    img.src = dataUrl;
  });
}
