INSERT INTO "Category" ("id", "name", "type", "color", "icon", "createdAt")
VALUES ('cat_expense_allowance', 'お小遣い', 'expense', '#a855f7', 'wallet', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
