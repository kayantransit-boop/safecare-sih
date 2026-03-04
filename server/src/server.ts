import Fastify from 'fastify';
import cors from '@fastify/cors';
import routes from './routes/routes';
import dotenv from 'dotenv';
import { pool } from './db';
import fs from 'fs';
import path from 'path';
dotenv.config();

const server = Fastify({ logger: true });
const PORT = parseInt(process.env.PORT || '3001');

server.register(cors, { origin: '*' });
server.register(routes, { prefix: '/api' });

async function initDB() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, '../../database/init.sql'), 'utf8');
    const safe = sql
      .replace(/CREATE TABLE /g, 'CREATE TABLE IF NOT EXISTS ')
      .split(';')
      .filter(s => s.trim() && !s.trim().startsWith('INSERT'))
      .join(';');
    await pool.query(safe);
    console.log('✅ Tables initialisées');
  } catch (e) {
    console.log('DB init:', (e as Error).message);
  }
}

server.listen({ port: PORT, host: '0.0.0.0' }, async (err) => {
  if (err) { server.log.error(err); process.exit(1); }
  console.log(`✅ SafeCare API sur http://localhost:${PORT}`);
  await initDB();
});
