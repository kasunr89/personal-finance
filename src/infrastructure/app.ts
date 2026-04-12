import Fastify from 'fastify';
import { syncLhvRoute } from './routes/sync-lhv.js';
import { syncEnableBankingRoute } from './routes/sync-enablebanking.js';

export function buildApp() {
	const app = Fastify({ logger: true });

	app.get('/health', async () => {
		return { status: 'ok' };
	});

	app.register(syncLhvRoute);
	app.register(syncEnableBankingRoute);

	return app;
}
