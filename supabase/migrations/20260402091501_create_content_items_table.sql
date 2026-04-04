/*
  # Create ContextVault Database Schema

  1. New Tables
    - `content_items`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `url` (text, the original content URL)
      - `title` (text, page/content title)
      - `original_text` (text, extracted text content)
      - `summary` (text, AI-generated summary)
      - `keywords` (text array, extracted keywords)
      - `topics` (text array, main topic categories)
      - `content_type` (text, article/video/tweet/thread/reel)
      - `embedding` (vector(1536), semantic embedding for search)
      - `status` (text, processing status: pending/processed/failed)
      - `created_at` (timestamptz, when captured)
      - `updated_at` (timestamptz, last update)
      - `metadata` (jsonb, additional platform-specific data)

  2. Extensions
    - Enable pgvector for semantic search capabilities

  3. Indexes
    - Vector similarity search index (HNSW)
    - User content lookup index
    - URL uniqueness per user

  4. Security
    - Enable RLS on content_items
    - Users can only access their own content
    - Separate policies for select, insert, update, delete
*/

-- Enable pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- Create content_items table
CREATE TABLE IF NOT EXISTS content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  title text NOT NULL,
  original_text text DEFAULT '',
  summary text DEFAULT '',
  keywords text[] DEFAULT '{}',
  topics text[] DEFAULT '{}',
  content_type text DEFAULT 'article',
  embedding vector(1536),
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE(user_id, url)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_items_user_id ON content_items(user_id);
CREATE INDEX IF NOT EXISTS idx_content_items_created_at ON content_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_items_status ON content_items(status);

-- Create HNSW index for fast vector similarity search
CREATE INDEX IF NOT EXISTS idx_content_items_embedding ON content_items 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Enable Row Level Security
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own content
CREATE POLICY "Users can view own content"
  ON content_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own content
CREATE POLICY "Users can insert own content"
  ON content_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own content
CREATE POLICY "Users can update own content"
  ON content_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own content
CREATE POLICY "Users can delete own content"
  ON content_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_content_items_updated_at
  BEFORE UPDATE ON content_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
