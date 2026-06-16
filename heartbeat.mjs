import { getDatabase } from "@netlify/database";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let sessionId;
  try {
    const body = await req.json();
    sessionId = body.sessionId;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!sessionId || typeof sessionId !== "string" || sessionId.length > 128) {
    return new Response("Invalid session ID", { status: 400 });
  }

  const db = getDatabase();

  await db.sql`
    INSERT INTO sessions (id, last_seen)
    VALUES (${sessionId}, NOW())
    ON CONFLICT (id) DO UPDATE SET last_seen = NOW()
  `;

  // Clean up stale sessions older than 5 minutes
  await db.sql`DELETE FROM sessions WHERE last_seen < NOW() - INTERVAL '5 minutes'`;

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
};

export const config = {
  path: "/api/heartbeat",
};
