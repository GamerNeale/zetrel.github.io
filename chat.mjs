import { getDatabase } from "@netlify/database";
import { getStore } from "@netlify/blobs";

const MAX_MESSAGE_LENGTH = 300;
const MAX_USERNAME_LENGTH = 32;
const MESSAGES_LIMIT = 50;
const IMAGE_KEY_PATTERN = /^chat\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default async (req) => {
  const db = getDatabase();

  if (req.method === "GET") {
    const messages = await db.sql`
      SELECT id, username, message, image_key, created_at
      FROM chat_messages
      ORDER BY created_at DESC
      LIMIT ${MESSAGES_LIMIT}
    `;
    return new Response(JSON.stringify({ messages: messages.reverse() }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "POST") {
    let username, message, image_key;
    try {
      const body = await req.json();
      username = body.username;
      message = body.message;
      image_key = body.image_key;
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (
      !username ||
      typeof username !== "string" ||
      username.trim().length === 0 ||
      username.length > MAX_USERNAME_LENGTH
    ) {
      return new Response("Invalid username", { status: 400 });
    }

    const hasMessage =
      message && typeof message === "string" && message.trim().length > 0;
    const hasImage = image_key && typeof image_key === "string";

    if (!hasMessage && !hasImage) {
      return new Response("Message or image required", { status: 400 });
    }

    if (hasMessage && message.length > MAX_MESSAGE_LENGTH) {
      return new Response("Message too long", { status: 400 });
    }

    if (hasImage && !IMAGE_KEY_PATTERN.test(image_key)) {
      return new Response("Invalid image key", { status: 400 });
    }

    const sanitizedUsername = username.trim().replace(/[<>]/g, "");
    const sanitizedMessage = hasMessage
      ? message.trim().replace(/[<>]/g, "")
      : null;
    const deleteToken = crypto.randomUUID();

    const [row] = await db.sql`
      INSERT INTO chat_messages (username, message, image_key, delete_token)
      VALUES (
        ${sanitizedUsername},
        ${sanitizedMessage},
        ${hasImage ? image_key : null},
        ${deleteToken}
      )
      RETURNING id, username, message, image_key, created_at
    `;

    await db.sql`
      DELETE FROM chat_messages
      WHERE id NOT IN (
        SELECT id FROM chat_messages ORDER BY created_at DESC LIMIT 500
      )
    `;

    return new Response(
      JSON.stringify({ message: row, delete_token: deleteToken }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  if (req.method === "DELETE") {
    let id, deleteToken;
    try {
      const body = await req.json();
      id = body.id;
      deleteToken = body.delete_token;
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (!id || !deleteToken) {
      return new Response("Missing id or delete_token", { status: 400 });
    }

    const [msg] = await db.sql`
      SELECT id, image_key, delete_token FROM chat_messages WHERE id = ${id}
    `;

    if (!msg) {
      return new Response("Message not found", { status: 404 });
    }

    if (msg.delete_token !== deleteToken) {
      return new Response("Unauthorized", { status: 403 });
    }

    await db.sql`DELETE FROM chat_messages WHERE id = ${id}`;

    if (msg.image_key) {
      try {
        const store = getStore("chat-images");
        await store.delete(msg.image_key);
      } catch {}
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config = {
  path: "/api/chat",
};
