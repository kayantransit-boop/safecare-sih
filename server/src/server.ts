import Fastify from 'fastify';
import cors from '@fastify/cors';
import routes from './routes/routes';
import dotenv from 'dotenv';
dotenv.config();

const server = Fastify({ logger: true });

server.register(cors, { origin: '*' });
server.register(routes);

const PORT = parseInt(process.env.PORT || '3001');

server.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) { server.log.error(err); process.exit(1); }
  console.log(`✅ SafeCare API démarrée sur http://localhost:${PORT}`);
});
