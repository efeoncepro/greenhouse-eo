import pg from 'pg'

const pool = new pg.Pool({ host:'127.0.0.1', port:15432, database:'greenhouse_app', user:'greenhouse_ops', password: process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD, ssl:false })

try {
  const cols = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='greenhouse_core' AND table_name='members'
      AND (column_name LIKE '%avatar%' OR column_name LIKE '%photo%' OR column_name LIKE '%picture%' OR column_name LIKE '%image%')`)

  console.log('Avatar columns in members:')
  cols.rows.forEach(c => console.log(' ', c.column_name))

  const sample = await pool.query(`SELECT member_id, display_name, avatar_url FROM greenhouse_core.members WHERE member_id='luis-reyes' LIMIT 1`).catch(() => null)

  if (sample) { console.log('Sample:', sample.rows[0]) }
} finally { await pool.end() }
