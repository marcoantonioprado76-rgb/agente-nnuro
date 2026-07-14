-- Add promo price field to store_products
ALTER TABLE "store_products" ADD COLUMN "price_promo" DECIMAL(10,2);
