-- Migration: products_user_level
-- Products move from bot-scoped to user-scoped with manual bot assignment via junction table

-- 1. Add user_id to products (populate from the bot's user_id)
ALTER TABLE products ADD COLUMN user_id UUID;
UPDATE products p SET user_id = b.user_id FROM bots b WHERE b.id = p.bot_id;
ALTER TABLE products ALTER COLUMN user_id SET NOT NULL;

-- 2. Create bot_products junction table
CREATE TABLE bot_products (
  bot_id    UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (bot_id, product_id)
);

-- 3. Migrate existing assignments (each product was already in one bot)
INSERT INTO bot_products (bot_id, product_id)
SELECT bot_id, id FROM products;

-- 4. Drop bot_id from products
ALTER TABLE products DROP COLUMN bot_id;

-- 5. Update index
DROP INDEX IF EXISTS products_bot_id_active_idx;
CREATE INDEX products_user_id_active_idx ON products(user_id, active);

-- 6. Add FK from products to users
ALTER TABLE products ADD CONSTRAINT products_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
