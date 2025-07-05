import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@shared/schema';
import dotenv from 'dotenv';

dotenv.config();

const client = postgres(process.env.DATABASE_URL!, { ssl: 'require' });
export const db = drizzle(client, { schema });

