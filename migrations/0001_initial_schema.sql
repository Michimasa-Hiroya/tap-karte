-- 看護記録履歴テーブル
CREATE TABLE IF NOT EXISTS nursing_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  input_text TEXT NOT NULL,
  output_text TEXT NOT NULL,
  options_style TEXT NOT NULL,
  options_doc_type TEXT NOT NULL,
  options_format TEXT NOT NULL,
  char_limit INTEGER NOT NULL DEFAULT 1000,
  response_time INTEGER, -- ミリ秒
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT
);

-- パフォーマンス統計テーブル  
CREATE TABLE IF NOT EXISTS performance_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_time INTEGER NOT NULL, -- ミリ秒
  error_type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT
);

-- セキュリティログテーブル
CREATE TABLE IF NOT EXISTS security_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL, -- 'input_validation', 'personal_info_detected', 'rate_limit', etc
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_nursing_records_created_at ON nursing_records(created_at);
CREATE INDEX IF NOT EXISTS idx_nursing_records_session_id ON nursing_records(session_id);
CREATE INDEX IF NOT EXISTS idx_performance_stats_created_at ON performance_stats(created_at);
CREATE INDEX IF NOT EXISTS idx_performance_stats_endpoint ON performance_stats(endpoint);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON security_logs(event_type);