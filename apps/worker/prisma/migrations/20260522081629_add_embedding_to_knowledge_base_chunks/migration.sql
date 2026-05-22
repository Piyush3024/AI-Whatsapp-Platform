-- Add embedding column to knowledge_base_chunks
-- pgvector extension already enabled (schema mein hai)

ALTER TABLE "knowledge_base_chunks" 
ADD COLUMN "embedding" vector(1536);

-- HNSW index for fast cosine similarity search
-- cosine distance kyun? OpenAI embeddings normalized hote hain
-- HNSW kyun IVFFlat se better? 
--   - No training needed (IVFFlat ko pehle data chahiye)
--   - Better recall at same speed
--   - Production recommended by pgvector official docs
CREATE INDEX CONCURRENTLY IF NOT EXISTS 
  knowledge_base_chunks_embedding_hnsw_idx 
ON "knowledge_base_chunks" 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);