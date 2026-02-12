-- User Sessions Table
-- Stores active sessions for authentication

CREATE TABLE user_sessions (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('ses'),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(token);
