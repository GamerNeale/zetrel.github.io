CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_created_at ON chat_messages (created_at DESC);
