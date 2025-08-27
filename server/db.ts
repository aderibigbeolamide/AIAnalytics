import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { env } from "../config/environment";

// Only use PostgreSQL if DATABASE_URL is a PostgreSQL connection string
const isPostgresUrl = env.DATABASE_URL.startsWith('postgresql://') || env.DATABASE_URL.startsWith('postgres://');

let pool: Pool | null = null;
let db: any = null;

if (isPostgresUrl) {
  neonConfig.webSocketConstructor = ws;
  console.log("Using PostgreSQL database URL:", env.DATABASE_URL.replace(/:\/\/[^@]+@/, "://***:***@"));
  pool = new Pool({ connectionString: env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
} else {
  console.log("DATABASE_URL is not PostgreSQL format - using MongoDB only");
}

export { pool, db };
