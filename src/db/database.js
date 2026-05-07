import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

// Helper untuk memastikan nilai environment selalu string
const env = (key, defaultValue) => process.env[key] || defaultValue || ''

const pool = new Pool({
  host: env('DB_HOST', 'localhost'),
  port: parseInt(env('DB_PORT', '5432')),
  database: env('DB_NAME', 'captive_portal'),
  user: env('DB_USER', 'postgres'),
  password: env('DB_PASSWORD', ''),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

async function query(text, params) {
  return pool.query(text, params)
}

async function initDatabase() {
  try {
    // Test koneksi
    await pool.query('SELECT NOW()')
    console.log('[DB] Connected to PostgreSQL')

    // Buat tabel local_users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS local_users (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username    VARCHAR(100) UNIQUE NOT NULL,
        password    TEXT NOT NULL,
        full_name   VARCHAR(200),
        is_active   BOOLEAN DEFAULT TRUE,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    console.log('[DB] Table local_users ready')

    // Buat tabel admin_users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username    VARCHAR(100) UNIQUE NOT NULL,
        password    TEXT NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    console.log('[DB] Table admin_users ready')

    // Seed default admin jika tabel kosong
    const result = await query('SELECT COUNT(*) FROM admin_users')
    if (parseInt(result.rows[0].count) === 0) {
      const plainPass = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123'
      const hashed = bcrypt.hashSync(plainPass, 10)
      await query(
        'INSERT INTO admin_users (username, password) VALUES ($1, $2)',
        ['admin', hashed]
      )
      console.log(`[DB] Default admin created: username=admin password=${plainPass}`)
    }

    console.log('[DB] Database initialized successfully')
  } catch (err) {
    console.error('[DB] Initialization error:', err.message)
    throw err
  }
}

export { pool, query, initDatabase }
