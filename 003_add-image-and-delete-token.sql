ALTER TABLE chat_messages
  ADD COLUMN image_key TEXT,
  ADD COLUMN delete_token TEXT;

ALTER TABLE chat_messages
  ALTER COLUMN message DROP NOT NULL;
