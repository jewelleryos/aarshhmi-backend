CREATE TABLE IF NOT EXISTS price_recalculation_jobs (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('prcj'),
    status VARCHAR(20) NOT NULL DEFAULT 'running',
    trigger_source VARCHAR(100) NOT NULL,
    triggered_by TEXT REFERENCES users(id),
    total_products INTEGER NOT NULL DEFAULT 0,
    processed_products INTEGER NOT NULL DEFAULT 0,
    failed_products INTEGER NOT NULL DEFAULT 0,
    error_details JSONB DEFAULT '[]',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_recalculation_jobs_status ON price_recalculation_jobs(status);
CREATE INDEX idx_price_recalculation_jobs_created_at ON price_recalculation_jobs(created_at DESC);
