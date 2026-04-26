import type { FastifyInstance } from 'fastify';
import type { EnableBankingGateway } from '../../../ports/enablebanking-gateway.js';
import { EnableBankingClient } from '../../http/enablebanking-client.js';
import { startEnableBankingAuth } from '../../../usecases/start-enablebanking-auth.js';

interface Options {
	provider?: EnableBankingGateway;
}

export async function getEnableBankingStartRoute(
	fastify: FastifyInstance,
	opts: Options = {},
) {
	const provider = opts.provider ?? new EnableBankingClient();

	fastify.get('/enablebanking/start', async (_request, reply) => {
		const redirectUrl = `${process.env.REDIRECT_HOST}/callback`;
		const result = await startEnableBankingAuth(provider, redirectUrl);
		return reply.send(result);
	});
}
