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
  maxDimension = 3200
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

      // Fill with solid white so any transparent/empty areas (letterbox bands
      // from aspect-ratio mismatch) render as white instead of grey/black.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
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
