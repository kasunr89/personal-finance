import Fastify from 'fastify';
import { dbPlugin } from './plugins/db.js';
import { syncLhvRoute } from './routes/sync-lhv.js';
import { syncEnableBankingRoute } from './routes/sync-enablebanking.js';
import { enableBankingCallbackRoute } from './routes/enablebanking-callback.js';
import { enableBankingAuthRoute } from './routes/enablebanking-auth.js';
import { transactionsRoute } from './routes/transactions.js';

export function buildApp() {
	const app = Fastify({ logger: true });

	app.get('/health', async () => {
		return { status: 'ok' };
	});

	app.register(dbPlugin);
	app.register(syncLhvRoute);
	app.register(syncEnableBankingRoute);
	app.register(enableBankingCallbackRoute);
	app.register(enableBankingAuthRoute);
	app.register(transactionsRoute);

	return app;
}
