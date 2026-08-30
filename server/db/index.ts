import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
const { Pool } = pg;
import * as schema from './schema.js';

let poolInstance: pg.Pool | null = null;

export function getPgPool(): pg.Pool | null {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.trim() === '' || databaseUrl.includes('your_postgresql_connection_string_here')) {
    return null;
  }

  if (!poolInstance) {
    poolInstance = new Pool({
      connectionString: databaseUrl,
      max: 10,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      ssl: databaseUrl.includes('sslmode=require') || databaseUrl.includes('neon.tech') || databaseUrl.includes('supabase.co')
        ? { rejectUnauthorized: false }
        : false,
    });

    poolInstance.on('error', (err: any) => {
      console.error('Dayflow HRMS PostgreSQL pool idle client error:', err?.message || err);
    });
  }

  return poolInstance;
}

export function createDrizzleClient() {
  const pool = getPgPool();
  if (!pool) return null;
  return drizzle(pool, { schema });
}

export const pgDb = createDrizzleClient();
export { schema };
