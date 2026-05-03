import type { FastifyInstance } from 'fastify';
import type { EnableBankingSessionGateway } from '../../../ports/enablebanking-session-gateway.js';
import { EnableBankingClient } from '../../http/enablebanking-client.js';
import { startEnableBankingAuth } from '../../../usecases/start-enablebanking-auth.js';

interface Options {
	sessionGateway?: EnableBankingSessionGateway;
}

export async function getEnableBankingStartRoute(
	fastify: FastifyInstance,
	opts: Options = {},
) {
	const sessionGateway = opts.sessionGateway ?? new EnableBankingClient();

	fastify.get('/enablebanking/start', async (_request, reply) => {
		const redirectUrl = `${process.env.REDIRECT_HOST}/callback`;
		const result = await startEnableBankingAuth(sessionGateway, redirectUrl);
		return reply.send(result);
	});
}
