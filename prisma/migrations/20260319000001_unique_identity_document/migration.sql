-- Add unique constraint to identity_document in users table
ALTER TABLE "users" ADD CONSTRAINT "users_identity_document_key" UNIQUE ("identity_document");
