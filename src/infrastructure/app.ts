import Fastify from 'fastify';
import { dbPlugin } from './plugins/db.js';
import { syncLhvRoute } from './routes/sync-lhv.js';
import { syncEnableBankingRoute } from './routes/sync-enablebanking.js';
import { enableBankingCallbackRoute } from './routes/enablebanking-callback.js';
import { enableBankingAuthRoute } from './routes/enablebanking-auth.js';
import { transactionsRoute } from './routes/transactions.js';
import routes from './routes/index.js';

export function buildApp() {
	const app = Fastify({ logger: true });

	app.get('/health', async () => {
		return { status: 'ok' };
	})
	.register(dbPlugin)
	.register(syncLhvRoute)
	.register(syncEnableBankingRoute)
	.register(enableBankingCallbackRoute)
	.register(enableBankingAuthRoute)
	.register(transactionsRoute)
	.register(routes, { sandbox: process.env.SANDBOX === 'true' });

	return app;
}
