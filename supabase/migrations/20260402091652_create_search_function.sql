/*
  # Create Semantic Search Function

  1. New Functions
    - `search_content` - Performs vector similarity search
      - Takes query embedding, similarity threshold, match count, and user_id filter
      - Returns top matching content items with similarity scores
      - Only returns content owned by the requesting user
  
  2. Purpose
    - Enable semantic search across user's saved content
    - Use cosine similarity to find semantically related items
    - Return results ranked by relevance
*/

-- Create semantic search function
CREATE OR REPLACE FUNCTION search_content(
  query_embedding TEXT,
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10,
  user_id_filter UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  url TEXT,
  title TEXT,
  summary TEXT,
  keywords TEXT[],
  topics TEXT[],
  content_type TEXT,
  created_at TIMESTAMPTZ,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    content_items.id,
    content_items.user_id,
    content_items.url,
    content_items.title,
    content_items.summary,
    content_items.keywords,
    content_items.topics,
    content_items.content_type,
    content_items.created_at,
    content_items.metadata,
    1 - (content_items.embedding <=> query_embedding::vector) AS similarity
  FROM content_items
  WHERE 
    content_items.user_id = user_id_filter
    AND content_items.status = 'processed'
    AND content_items.embedding IS NOT NULL
    AND 1 - (content_items.embedding <=> query_embedding::vector) > match_threshold
  ORDER BY content_items.embedding <=> query_embedding::vector
  LIMIT match_count;
END;
$$;
