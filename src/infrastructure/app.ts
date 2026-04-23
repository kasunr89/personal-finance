import Fastify from 'fastify';
import { dbPlugin } from './plugins/db.js';
import routes from './routes/index.js';

export function buildApp() {
	const app = Fastify({ logger: true });

	app.get('/health', async () => {
		return { status: 'ok' };
	})
	.register(dbPlugin)
	.register(routes, { sandbox: process.env.SANDBOX === 'true' });

	return app;
}
