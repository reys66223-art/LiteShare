-- LiteShare Database Schema for Neon PostgreSQL
-- Run this in Neon SQL Editor: https://console.neon.tech

-- Enable UUID extension (optional, if you want to use UUIDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create User table
CREATE TABLE IF NOT EXISTS "User" (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create File table
CREATE TABLE IF NOT EXISTS "File" (
    id TEXT PRIMARY KEY DEFAULT CONCAT('cuid_', REPLACE(gen_random_uuid()::text, '-', '')),
    name TEXT NOT NULL,
    size INTEGER NOT NULL,
    type TEXT NOT NULL,
    "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "uploadThingId" TEXT UNIQUE NOT NULL,
    "uploadThingUrl" TEXT NOT NULL,
    "userId" TEXT,
    "isGuest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "File_userId_fkey" 
        FOREIGN KEY ("userId") 
        REFERENCES "User"(id) 
        ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "File_userId_idx" ON "File"("userId");
CREATE INDEX IF NOT EXISTS "File_id_idx" ON "File"(id);
CREATE INDEX IF NOT EXISTS "File_uploadDate_idx" ON "File"("uploadDate" DESC);
CREATE INDEX IF NOT EXISTS "File_expiresAt_idx" ON "File"("expiresAt");

-- Create index for searching files by name
CREATE INDEX IF NOT EXISTS "File_name_idx" ON "File" USING gin (name gin_trgm_ops);

-- Add trigger to automatically update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_updated_at
    BEFORE UPDATE ON "User"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_file_updated_at
    BEFORE UPDATE ON "File"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert a test user (optional)
-- INSERT INTO "User" (id, email, name) VALUES ('test-user-1', 'test@example.com', 'Test User');

-- Verify tables created
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
