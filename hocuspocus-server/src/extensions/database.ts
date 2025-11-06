import * as Y from 'yjs';
import pg from 'pg';

const { Pool } = pg;

interface DatabaseExtensionOptions {
  postgresUrl: string;
}

export function createDatabaseExtension(options: DatabaseExtensionOptions) {
  const pool = new Pool({
    connectionString: options.postgresUrl,
  });

  // Initialize database table
  initializeDatabase(pool);

  return {
    async onLoadDocument({ documentName }: { documentName: string }) {
      try {
        const result = await pool.query(
          'SELECT data FROM yjs_documents WHERE name = $1',
          [documentName]
        );

        if (result.rows.length > 0) {
          const data = result.rows[0].data;
          const uint8Array = new Uint8Array(data);
          const doc = new Y.Doc();
          Y.applyUpdate(doc, uint8Array);
          return doc;
        }

        return null;
      } catch (error) {
        console.error('Failed to load document:', error);
        return null;
      }
    },

    async onStoreDocument({ documentName, document }: { documentName: string; document: Y.Doc }) {
      try {
        const update = Y.encodeStateAsUpdate(document);
        const buffer = Buffer.from(update);

        await pool.query(
          `INSERT INTO yjs_documents (name, data, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (name) 
           DO UPDATE SET data = $2, updated_at = NOW()`,
          [documentName, buffer]
        );
      } catch (error) {
        console.error('Failed to store document:', error);
      }
    },

    async onDestroy() {
      await pool.end();
    },
  };
}

async function initializeDatabase(pool: pg.Pool) {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS yjs_documents (
        name TEXT PRIMARY KEY,
        data BYTEA NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Database table initialized');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

