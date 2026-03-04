import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import routes from './routes/routes';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { pool } from './db';
dotenv.config();

const server = Fastify({ logger: true });
const PORT = parseInt(process.env.PORT || '3001');
const isProd = process.env.NODE_ENV === 'production';

server.register(cors, { origin: '*' });
server.register(routes, { prefix: '/api' });

// Serve React build in production
if (isProd) {
  const clientDist = path.join(__dirname, '../../client/dist');
  if (fs.existsSync(clientDist)) {
    server.register(staticPlugin, { root: clientDist, prefix: '/' });
    server.setNotFoundHandler((_req, reply) => {
      reply.sendFile('index.html');
    });
  }
}

// Init database tables on startup
async function initDB() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, '../../database/init.sql'), 'utf8');
    // Only create tables if they don't exist
    const initSafe = sql.replace(/CREATE TABLE /g, 'CREATE TABLE IF NOT EXISTS ')
                        .replace(/INSERT INTO/g, 'INSERT INTO');
    await pool.query(initSafe);
    console.log('✅ Base de données initialisée');
  } catch (e) {
    console.log('DB déjà initialisée ou erreur:', (e as Error).message);
  }
}

server.listen({ port: PORT, host: '0.0.0.0' }, async (err) => {
  if (err) { server.log.error(err); process.exit(1); }
  console.log(`✅ SafeCare API démarrée sur http://localhost:${PORT}`);
  await initDB();
});
