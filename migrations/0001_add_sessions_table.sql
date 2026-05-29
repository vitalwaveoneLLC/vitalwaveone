-- migrations/0001_add_sessions_table.sql
-- Add sessions table for server-side session management
-- Run: psql -h neon.tech -U postgres -d routeflow < migrations/0001_add_sessions_table.sql

-- Sessions table (replace localStorage)
CREATE TABLE IF NOT EXISTS sessions (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  token                 text UNIQUE NOT NULL,
  user_id               uuid NOT NULL,
  user_type             text NOT NULL,  -- 'admin' | 'driver'
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  csrf_token            text,
  ip_address            text,
  user_agent            text,
  is_active             boolean DEFAULT true,
  last_activity_at      timestamptz DEFAULT now(),
  created_at            timestamptz DEFAULT now(),
  expires_at            timestamptz NOT NULL
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_tenant_id ON sessions(tenant_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Auto cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM sessions WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Optional: Schedule cleanup job (requires pg_cron extension)
-- SELECT cron.schedule('cleanup_sessions', '0 * * * *', 'SELECT cleanup_expired_sessions()');

-- CSRF tokens table
CREATE TABLE IF NOT EXISTS csrf_tokens (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id            uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  token                 text UNIQUE NOT NULL,
  created_at            timestamptz DEFAULT now(),
  expires_at            timestamptz NOT NULL
);

CREATE INDEX idx_csrf_tokens_session_id ON csrf_tokens(session_id);
CREATE INDEX idx_csrf_tokens_token ON csrf_tokens(token);
