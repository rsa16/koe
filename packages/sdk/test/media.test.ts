import { describe, it, expect } from "vitest";
import {
  createImgbbMediaProvider,
  MediaUploadError,
} from "../src/index.js";
import { mockFetch } from "./helpers.js";

describe("imgbb media provider", () => {
  it("uploads a file to imgbb with the client key and returns the hosted url", async () => {
    const { fetchFn, calls } = mockFetch(() => ({
      status: 200,
      body: {
        data: { url: "https://i.ibb.co/abc123/pic.png" },
        success: true,
        status: 200,
      },
    }));
    const provider = createImgbbMediaProvider({ apiKey: "my-key", fetch: fetchFn });
    const file = new Blob(["fake-bytes"], { type: "image/png" });

    const result = await provider.upload(file);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.imgbb.com/1/upload?key=my-key");
    expect(calls[0].init.method).toBe("POST");
    const body = calls[0].init.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    const uploaded = body.get("image");
    expect(uploaded).toBeInstanceOf(Blob);
    expect((uploaded as Blob).size).toBe(file.size);
    expect((uploaded as Blob).type).toBe("image/png");
    expect(result).toEqual({ url: "https://i.ibb.co/abc123/pic.png" });
  });

  it("url-encodes the client key", async () => {
    const { fetchFn, calls } = mockFetch(() => ({
      status: 200,
      body: { data: { url: "https://i.ibb.co/x/y.png" }, success: true },
    }));
    const provider = createImgbbMediaProvider({ apiKey: "a/b c", fetch: fetchFn });

    await provider.upload(new Blob(["x"]));

    expect(calls[0].url).toBe(
      "https://api.imgbb.com/1/upload?key=a%2Fb%20c"
    );
  });

  it("throws MediaUploadError when imgbb rejects the request", async () => {
    const { fetchFn } = mockFetch(() => ({
      status: 400,
      body: {
        status_code: 400,
        error: { message: "Invalid API key", code: 100 },
      },
    }));
    const provider = createImgbbMediaProvider({ apiKey: "bad", fetch: fetchFn });

    const promise = provider.upload(new Blob(["x"]));

    await expect(promise).rejects.toBeInstanceOf(MediaUploadError);
    await expect(promise).rejects.toMatchObject({
      message: "Invalid API key",
      status: 400,
    });
  });

  it("throws MediaUploadError when imgbb reports success:false with a 200", async () => {
    const { fetchFn } = mockFetch(() => ({
      status: 200,
      body: {
        success: false,
        status: 400,
        error: { message: "Bad image data" },
      },
    }));
    const provider = createImgbbMediaProvider({ apiKey: "key", fetch: fetchFn });

    await expect(provider.upload(new Blob(["x"]))).rejects.toMatchObject({
      message: "Bad image data",
    });
  });

  it("requires an API key", () => {
    expect(() => createImgbbMediaProvider({ apiKey: "" })).toThrow();
  });
});
