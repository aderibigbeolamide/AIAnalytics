import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Use a fallback local database URL if external database is unavailable
const defaultDatabaseUrl = "postgresql://postgres:postgres@localhost:5432/eventvalidate";
const databaseUrl = process.env.DATABASE_URL || defaultDatabaseUrl;

console.log("Using database URL:", databaseUrl.replace(/:\/\/[^@]+@/, "://***:***@"));

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });
