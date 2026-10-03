INSERT INTO "Category" ("id", "name", "type", "color", "icon", "createdAt")
VALUES ('cat_expense_child', '子ども', 'expense', '#ec4899', 'baby', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
