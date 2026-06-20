const { Pool } = require('pg');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

// Default to a temporary in-memory-like experience if no DB is provided,
// but encourage setting up Supabase.
const connectionString = process.env.DATABASE_URL;

let pool;
if (connectionString) {
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false } // Required for Supabase/Render
  });
} else {
  console.warn('⚠️ No DATABASE_URL provided. Please set up a Supabase PostgreSQL database.');
  // We will initialize a dummy pool that will throw clear errors if queried without a DB
  pool = {
    query: async () => {
      throw new Error("Database not connected. Set DATABASE_URL in .env");
    }
  };
}

const initDb = async () => {
  if (!connectionString) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Chat messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        sentiment_score REAL DEFAULT 0,
        crisis_flag BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Mood logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS mood_logs (
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        mood TEXT NOT NULL,
        mood_score INTEGER NOT NULL CHECK (mood_score BETWEEN 1 AND 5),
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Journal entries table
    await client.query(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT, -- JSON stringified array
        gratitude TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Breathing sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS breathing_sessions (
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        technique TEXT NOT NULL,
        duration INTEGER NOT NULL, -- seconds
        completed BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query('COMMIT');
    console.log('✅ PostgreSQL database schemas initialized');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to initialize database schema:', error);
  } finally {
    client.release();
  }
};

// Initialize DB immediately
initDb();

module.exports = {
  pool,
  uuidv4
};
