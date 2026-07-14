-- CreateEnum
CREATE TYPE "MarketplaceCourseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "MarketplacePurchaseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable marketplace_categories
CREATE TABLE marketplace_categories (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);

-- Seed default categories
INSERT INTO marketplace_categories (name) VALUES
  ('Marketing Digital'),
  ('Finanzas y Negocios'),
  ('Diseño y Creatividad'),
  ('Tecnología'),
  ('Desarrollo Personal'),
  ('Idiomas'),
  ('Salud y Bienestar'),
  ('Otro');

-- CreateTable marketplace_courses
CREATE TABLE marketplace_courses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES marketplace_categories(id),
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  cover_url   TEXT,
  price       NUMERIC(10,2) NOT NULL,
  whatsapp    TEXT,
  status      "MarketplaceCourseStatus" NOT NULL DEFAULT 'PENDING',
  admin_notes TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketplace_courses_status_category ON marketplace_courses(status, category_id);

-- CreateTable marketplace_course_files
CREATE TABLE marketplace_course_files (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id  UUID NOT NULL REFERENCES marketplace_courses(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  drive_url  TEXT NOT NULL,
  "order"    INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_marketplace_course_files_course_order ON marketplace_course_files(course_id, "order");

-- CreateTable marketplace_purchases
CREATE TABLE marketplace_purchases (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id  UUID NOT NULL REFERENCES marketplace_courses(id) ON DELETE CASCADE,
  status     "MarketplacePurchaseStatus" NOT NULL DEFAULT 'PENDING',
  proof_url  TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(buyer_id, course_id)
);

CREATE INDEX idx_marketplace_purchases_status ON marketplace_purchases(status);
