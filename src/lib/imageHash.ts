// Simple SHA-256 hash of a data-URL / base64 image so we can identify the same photo across uploads.
export async function hashImage(dataUrl: string): Promise<string> {
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  const bytes = Uint8Array.from(atob(base64.slice(0, 200000)), (c) => c.charCodeAt(0));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
