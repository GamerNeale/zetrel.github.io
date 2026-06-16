import { getStore } from "@netlify/blobs";

const IMAGE_KEY_PATTERN =
  /^chat\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default async (req) => {
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const key = url.searchParams.get("key");

  if (!key || !IMAGE_KEY_PATTERN.test(key)) {
    return new Response("Invalid or missing key", { status: 400 });
  }

  const store = getStore("chat-images");
  const result = await store.getWithMetadata(key, { type: "blob" });

  if (!result) {
    return new Response("Not found", { status: 404 });
  }

  const contentType = result.metadata?.contentType || "application/octet-stream";

  return new Response(result.data, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};

export const config = {
  path: "/api/chat/image",
};
