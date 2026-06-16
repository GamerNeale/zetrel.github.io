import { getDatabase } from "@netlify/database";

export default async () => {
  const db = getDatabase();

  const result = await db.sql`
    SELECT COUNT(*)::int AS count FROM sessions
    WHERE last_seen > NOW() - INTERVAL '60 seconds'
  `;

  const count = result[0]?.count ?? 0;

  return new Response(JSON.stringify({ count }), {
    headers: { "Content-Type": "application/json" },
  });
};

export const config = {
  path: "/api/count",
};
