INSERT INTO "ImportExclusion" ("id", "name", "createdAt")
VALUES
  ('skip_paypay_card', 'PAYPAYカード', CURRENT_TIMESTAMP),
  ('skip_paypay_card_halfwidth', 'ﾍﾟｲﾍﾟｲｶｰﾄﾞ', CURRENT_TIMESTAMP),
  ('skip_rakuten_card_service', 'ラクテンカードサービ', CURRENT_TIMESTAMP),
  ('skip_rakuten_card_halfwidth', 'ﾗｸﾃﾝｶｰﾄﾞ', CURRENT_TIMESTAMP),
  ('skip_charge', 'チャージ', CURRENT_TIMESTAMP),
  ('skip_charge_english', 'charge', CURRENT_TIMESTAMP),
  ('skip_received', '受取', CURRENT_TIMESTAMP),
  ('skip_reward', '還元', CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
