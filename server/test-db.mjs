import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/dayflow',
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') ? { rejectUnauthorized: false } : undefined,
});

async function main() {
  const usersRes = await pool.query('SELECT id, email, role, employee_id FROM users');
  console.log('Postgres users count:', usersRes.rows.length);
  console.log('Users:', usersRes.rows);

  const empRes = await pool.query('SELECT id, employee_code, first_name, last_name, email FROM employees LIMIT 5');
  console.log('Employees:', empRes.rows);
  await pool.end();
}

main().catch(console.error);
