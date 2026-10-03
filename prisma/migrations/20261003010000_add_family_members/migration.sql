INSERT INTO "Member" ("id", "name", "color", "emoji", "createdAt")
VALUES
  ('member_soa', '奏空', '#3b82f6', '🙂', CURRENT_TIMESTAMP),
  ('member_hinata', '日向', '#f97316', '🙂', CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
