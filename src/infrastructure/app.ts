import Fastify from 'fastify';
import { dbPlugin } from './plugins/db.js';
import { syncEnableBankingRoute } from './routes/sync-enablebanking.js';
import { enableBankingAuthRoute } from './routes/enablebanking-auth.js';
import { transactionsRoute } from './routes/transactions.js';
import routes from './routes/index.js';

export function buildApp() {
	const app = Fastify({ logger: true });

	app.get('/health', async () => {
		return { status: 'ok' };
	})
	.register(dbPlugin)
	.register(syncEnableBankingRoute)
.register(enableBankingAuthRoute)
	.register(transactionsRoute)
	.register(routes, { sandbox: process.env.SANDBOX === 'true' });

	return app;
}
