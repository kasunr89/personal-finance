import type { FastifyInstance } from 'fastify';
import type { EnableBankingSessionGateway } from '../../../ports/enablebanking-session-gateway.js';
import { EnableBankingClient } from '../../http/enablebanking-client.js';
import { createEnableBankingSession } from '../../../usecases/create-enablebanking-session.js';

interface Options {
	sessionGateway?: EnableBankingSessionGateway;
}

export async function getEnableBankingCallbackRoute(
	fastify: FastifyInstance,
	opts: Options = {},
) {
	const sessionGateway = opts.sessionGateway ?? new EnableBankingClient();

	fastify.get('/callback', async (request, reply) => {
		const { code } = request.query as { code?: string };

		if (!code) {
			return reply.status(400).send({ error: 'Missing code parameter' });
		}

		const session = await createEnableBankingSession(sessionGateway, code);

		return reply.send({
			accounts: session.accounts,
			accountsData: session.accountsData,
		});
	});
}
