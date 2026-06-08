-- Add HNSW index on knowledge_base_chunks embedding column
-- This prevents full-table scans during RAG semantic search queries
-- Uses cosine distance operator to match the <=> operator used in queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS knowledge_base_chunks_embedding_hnsw_idx
ON knowledge_base_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
