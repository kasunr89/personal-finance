import type { FastifyInstance } from 'fastify';
import { createSession } from '../../adapters/banks/enablebanking/enablebanking-provider.js';

export async function enableBankingCallbackRoute(app: FastifyInstance) {
	app.get('/callback', async (request, reply) => {
		const { code } = request.query as { code?: string };

		if (!code) {
			return reply.status(400).send({ error: 'Missing code parameter' });
		}

		const session = await createSession(code);

		return reply.send({
			accounts: session.accounts,
			accounts_data: session.accounts_data,
		});
	});
}
