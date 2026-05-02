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
 * Place an image on a transparent canvas with the exact source aspect ratio.
 * This prevents wide buffet outputs from being delivered as square/cropped canvases.
 */
export function containImageInTransparentCanvas(
  dataUrl: string,
  targetWidth: number,
  targetHeight: number,
  maxDimension = 2400
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let canvasWidth = targetWidth;
      let canvasHeight = targetHeight;

      if (canvasWidth > maxDimension || canvasHeight > maxDimension) {
        const scale = Math.min(maxDimension / canvasWidth, maxDimension / canvasHeight);
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

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      const scale = Math.min(canvasWidth / img.naturalWidth, canvasHeight / img.naturalHeight);
      const drawWidth = Math.round(img.naturalWidth * scale);
      const drawHeight = Math.round(img.naturalHeight * scale);
      const dx = Math.round((canvasWidth - drawWidth) / 2);
      const dy = Math.round((canvasHeight - drawHeight) / 2);
      ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to fit image to transparent canvas'));
    img.src = dataUrl;
  });
}
