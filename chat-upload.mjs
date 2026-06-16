import { getStore } from "@netlify/blobs";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let formData;
  try {
    formData = await req.formData();
  } catch {
    return new Response("Invalid form data", { status: 400 });
  }

  const file = formData.get("image");
  if (!file || typeof file === "string") {
    return new Response("No image provided", { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return new Response("Invalid image type. Allowed: JPEG, PNG, GIF, WebP", {
      status: 400,
    });
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return new Response("Image too large (max 5 MB)", { status: 400 });
  }

  const key = `chat/${crypto.randomUUID()}`;
  const store = getStore("chat-images");
  const buffer = await file.arrayBuffer();

  await store.set(key, buffer, {
    metadata: { contentType: file.type },
  });

  return new Response(JSON.stringify({ key }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = {
  path: "/api/chat/upload",
};
