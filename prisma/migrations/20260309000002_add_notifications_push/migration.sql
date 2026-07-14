-- Notifications table (in-app bell)
CREATE TABLE notifications (
  id         UUID        NOT NULL DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL,
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL,
  link       TEXT,
  read       BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX notifications_user_id_read_idx ON notifications(user_id, read);

-- Push subscriptions table (Web Push)
CREATE TABLE push_subscriptions (
  id         UUID        NOT NULL DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL,
  endpoint   TEXT        NOT NULL UNIQUE,
  p256dh     TEXT        NOT NULL,
  auth       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
);
