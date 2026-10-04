const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5433,
  database: process.env.DB_NAME || 'ai_saas',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function runMigrations() {
  const client = await pool.connect();
  try {
    const migrationDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} migration(s)`);

    // Create schema_migrations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get already applied migrations
    const applied = await client.query('SELECT filename FROM schema_migrations ORDER BY filename');
    const appliedSet = new Set(applied.rows.map(r => r.filename));

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`  Skipping ${file} (already applied)`);
        continue;
      }

      console.log(`  Running ${file}...`);
      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
      
      try {
        await client.query('BEGIN');
        // Use the raw query - pg can handle multi-statement SQL when we pass it as a single string
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`    ✓ ${file} applied`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`    ✗ ${file} failed:`, err.message);
        process.exit(1);
      }
    }

    console.log('\nMigration complete!');
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
