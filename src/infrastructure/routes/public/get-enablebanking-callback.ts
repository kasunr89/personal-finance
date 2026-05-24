import type { FastifyInstance } from 'fastify';
import type { EnableBankingSessionGateway } from '../../../ports/enablebanking-session-gateway.js';
import type { SessionRepo } from '../../../ports/session-repo.js';
import { EnableBankingClient } from '../../http/enablebanking-client.js';
import { NeonSessionRepo } from '../../../adapters/db/neon-session-repo.js';
import { createEnableBankingSession } from '../../../usecases/create-enablebanking-session.js';

interface Options {
	sessionGateway?: EnableBankingSessionGateway;
	sessionRepo?: SessionRepo;
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

		const sessionRepo = opts.sessionRepo ?? new NeonSessionRepo(fastify.db);
		const session = await createEnableBankingSession(sessionGateway, sessionRepo, code);

		return reply.send(session);
	});
}
