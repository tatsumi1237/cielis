CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raw TEXT NOT NULL,             -- 入力された原文(これが唯一の正)
  title TEXT,                    -- LLMによる一行要約
  event_date TEXT,               -- 出来事の日付 YYYY-MM-DD(不明ならNULL)
  keywords TEXT,                 -- 検索用キーワード(スペース区切り)
  created_at TEXT NOT NULL       -- 記録した日時(ISO, UTC)
);
CREATE INDEX IF NOT EXISTS idx_notes_event_date ON notes(event_date);
