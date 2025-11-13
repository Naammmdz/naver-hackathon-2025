# Database Migrations

This directory contains SQL migration files for the Agentic AI Project Management System.

## 📋 Migration Files

| File | Description | Dependencies |
|------|-------------|--------------|
| `001_add_foreign_keys.sql` | Add missing foreign key constraints | None |
| `002_add_indexes.sql` | Add performance indexes | None |
| `003_install_pgvector.sql` | Install pgvector extension | PostgreSQL with pgvector |
| `004_create_document_chunks.sql` | Create document_chunks table | 003 (pgvector) |
| `005_create_conversations.sql` | Create conversations table | None |
| `006_create_long_term_memory.sql` | Create long_term_memory table | None |
| `007_create_agent_actions.sql` | Create agent_actions table | 005 (conversations) |
| `008_create_hitl_feedback.sql` | Create hitl_feedback table | 005, 006 |

## 🚀 Running Migrations

### Automatic (Recommended)

Use the Python script to run all migrations in order:

```bash
cd /home/thanhnx/naver/naver-hackathon-2025/backend-ai-service/database
python run_migrations.py
```

The script will:
- ✅ Run all migrations in the correct order
- ✅ Verify each migration succeeded
- ✅ Rollback on errors
- ✅ Display verification results
- ✅ Show table statistics

### Manual

Run individual migration files using `psql`:

```bash
# Load environment variables
source ../.env

# Run each migration
psql $NEONDB < migrations/001_add_foreign_keys.sql
psql $NEONDB < migrations/002_add_indexes.sql
psql $NEONDB < migrations/003_install_pgvector.sql
psql $NEONDB < migrations/004_create_document_chunks.sql
psql $NEONDB < migrations/005_create_conversations.sql
psql $NEONDB < migrations/006_create_long_term_memory.sql
psql $NEONDB < migrations/007_create_agent_actions.sql
psql $NEONDB < migrations/008_create_hitl_feedback.sql
```

## 🔍 Verification

After running migrations, verify the changes:

```sql
-- Check pgvector extension
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

-- Check new tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check foreign keys
SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- Check indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

## 📊 Expected Results

After successful migration:

### New Tables (5)
- `document_chunks` - For RAG retrieval
- `conversations` - Short-term memory
- `long_term_memory` - Learned knowledge
- `agent_actions` - Agent audit log
- `hitl_feedback` - Human-in-the-loop feedback

### New Foreign Keys (~10)
- Tasks, Boards, Documents → Workspaces
- Task_docs → Tasks, Documents
- Document_chunks → Documents, Workspaces
- Agent_actions → Workspaces, Conversations
- HITL_feedback → Workspaces, Conversations, Long_term_memory

### New Indexes (~60+)
- Performance indexes on all major tables
- Vector index for embeddings (IVFFlat)
- GIN indexes for JSONB columns
- Partial indexes for filtered queries

## ⚠️ Important Notes

### pgvector Extension

The `003_install_pgvector.sql` migration requires the pgvector extension to be available in your PostgreSQL instance. Neon PostgreSQL should have this pre-installed.

If you encounter errors:
```sql
ERROR:  extension "vector" is not available
```

Contact your database administrator or Neon support.

### Vector Index Optimization

The initial vector index in `004_create_document_chunks.sql` is created with `lists = 100`, which is suitable for ~10,000 chunks.

After inserting significant data, rebuild the index:

```sql
-- Drop old index
DROP INDEX idx_chunks_embedding;

-- Recreate with optimal list size
-- For N rows: lists ≈ sqrt(N)
CREATE INDEX idx_chunks_embedding ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = <calculated_value>);
```

### Data Safety

All migrations use:
- `BEGIN` and `COMMIT` for transactions
- `IF NOT EXISTS` clauses where appropriate
- `DO $$` blocks for conditional logic

This makes them safe to run multiple times (idempotent).

### Rollback

If you need to rollback, manually drop the new tables:

```sql
DROP TABLE IF EXISTS hitl_feedback CASCADE;
DROP TABLE IF EXISTS agent_actions CASCADE;
DROP TABLE IF EXISTS long_term_memory CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS document_chunks CASCADE;
DROP EXTENSION IF EXISTS vector;
```

**Warning:** This will delete all data in these tables!

## 🐛 Troubleshooting

### Connection Issues
```bash
# Test connection first
python test_neondb_connection.py
```

### Migration Failures

Check the error message and pgcode:
- `23505`: Unique violation (constraint already exists)
- `42P07`: Table already exists
- `42710`: Extension already exists
- `42883`: Function doesn't exist

Most of these are safe to ignore if you're re-running migrations.

### Performance Issues

If migrations are slow:
1. Check database resources (CPU, memory)
2. Consider running index creation separately
3. Use `CONCURRENTLY` for index creation (requires autocommit)

## 📝 Next Steps

After successful migration:

1. ✅ **Verify schema** - Run test_neondb_connection.py
2. ✅ **Create SQLAlchemy models** - database/models/
3. ✅ **Implement repositories** - database/repositories/
4. ✅ **Test CRUD operations** - Create test data

See `docs/IMPLEMENTATION_PLAN.md` for the full roadmap.
