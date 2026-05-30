import type { FastifyInstance } from 'fastify';
import type { EnableBankingSessionGateway } from '../../../ports/enablebanking-session-gateway.js';
import type { SessionRepo } from '../../../ports/session-repo.js';
import { EnableBankingClient } from '../../http/enablebanking-client.js';
import { NeonSessionRepo } from '../../../adapters/db/neon-session-repo.js';
import { startEnableBankingAuth } from '../../../usecases/start-enablebanking-auth.js';

interface Options {
	sessionGateway?: EnableBankingSessionGateway;
	sessionRepo?: SessionRepo;
}

export async function getEnableBankingStartRoute(
	fastify: FastifyInstance,
	opts: Options = {},
) {
	const sessionGateway = opts.sessionGateway ?? new EnableBankingClient();

	fastify.get('/:bank/start', async (request, reply) => {
		const { bank } = request.params as { bank: string };
		const sessionRepo = opts.sessionRepo ?? new NeonSessionRepo(fastify.db);
		const redirectUrl = `${process.env.REDIRECT_HOST}/callback`;
		const result = await startEnableBankingAuth(sessionGateway, sessionRepo, redirectUrl, bank);

		return reply.send(result);
	});
}
