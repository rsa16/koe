import { z } from "zod";

export interface MediaUploadResult {
  url: string;
}

export interface MediaProvider {
  upload(file: Blob): Promise<MediaUploadResult>;
}

export interface MediaUploadErrorOptions {
  status?: number;
}

export class MediaUploadError extends Error {
  readonly status?: number;

  constructor(message: string, options: MediaUploadErrorOptions = {}) {
    super(message);
    this.name = "MediaUploadError";
    this.status = options.status;
  }
}

export interface ImgbbMediaProviderOptions {
  apiKey: string;
  fetch?: typeof globalThis.fetch;
}

const IMGBB_ENDPOINT = "https://api.imgbb.com/1/upload";

const ImgbbResponseSchema = z.object({
  data: z.object({ url: z.string() }).optional(),
  success: z.boolean().optional(),
  error: z.object({ message: z.string() }).optional(),
});

function errorMessage(payload: unknown, fallback: string): string {
  const parsed = ImgbbResponseSchema.safeParse(payload);
  if (parsed.success && parsed.data.error?.message) {
    return parsed.data.error.message;
  }
  return fallback;
}

export function createImgbbMediaProvider(
  options: ImgbbMediaProviderOptions
): MediaProvider {
  if (!options.apiKey) {
    throw new Error("imgbb API key is required");
  }
  const fetchFn = options.fetch ?? globalThis.fetch;
  const url = `${IMGBB_ENDPOINT}?key=${encodeURIComponent(options.apiKey)}`;

  return {
    async upload(file) {
      const form = new FormData();
      form.append("image", file);

      const response = await fetchFn(url, { method: "POST", body: form });
      let payload: unknown = undefined;
      try {
        payload = await response.json();
      } catch {
        // Ignore non-JSON error responses.
      }

      if (!response.ok) {
        throw new MediaUploadError(
          errorMessage(payload, `imgbb upload failed (${response.status})`),
          { status: response.status }
        );
      }

      const parsed = ImgbbResponseSchema.safeParse(payload);
      if (
        !parsed.success ||
        parsed.data.success === false ||
        !parsed.data.data?.url
      ) {
        throw new MediaUploadError(
          errorMessage(payload, "imgbb upload failed"),
          { status: response.status }
        );
      }

      return { url: parsed.data.data.url };
    },
  };
}
