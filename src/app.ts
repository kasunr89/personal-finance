import Fastify from 'fastify';
import { syncLhvRoute } from './routes/sync-lhv.js';

export function buildApp() {
	const app = Fastify({ logger: true });

	app.get('/health', async () => {
		return { status: 'ok' };
	});

	app.register(syncLhvRoute);

	return app;
}
