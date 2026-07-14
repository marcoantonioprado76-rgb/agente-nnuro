-- Add Social Media Publisher tables

CREATE TABLE IF NOT EXISTS social_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  network         TEXT NOT NULL,
  access_token    TEXT NOT NULL,
  refresh_token   TEXT,
  account_id      TEXT NOT NULL,
  account_name    TEXT NOT NULL,
  account_avatar  TEXT,
  page_id         TEXT,
  page_name       TEXT,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, network)
);

CREATE TABLE IF NOT EXISTS social_posts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  media_url    TEXT,
  media_type   TEXT,
  post_type    TEXT NOT NULL DEFAULT 'feed',
  status       TEXT NOT NULL DEFAULT 'DRAFT',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS social_post_networks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id          UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  connection_id    UUID NOT NULL REFERENCES social_connections(id) ON DELETE CASCADE,
  network          TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'PENDING',
  provider_post_id TEXT,
  error            TEXT,
  published_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_social_posts_user_id ON social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled ON social_posts(scheduled_at) WHERE status = 'SCHEDULED';
CREATE INDEX IF NOT EXISTS idx_social_post_networks_post_id ON social_post_networks(post_id);
