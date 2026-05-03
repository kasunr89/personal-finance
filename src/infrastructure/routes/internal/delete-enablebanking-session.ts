import type { FastifyInstance } from 'fastify';
import { Type, type Static } from '@sinclair/typebox';
import type { EnableBankingSessionGateway } from '../../../ports/enablebanking-session-gateway.js';
import { EnableBankingClient } from '../../http/enablebanking-client.js';
import { deleteEnableBankingSession } from '../../../usecases/delete-enablebanking-session.js';

const Params = Type.Object({
	sessionId: Type.String(),
});

type Params = Static<typeof Params>;

interface Options {
	sessionGateway?: EnableBankingSessionGateway;
}

export async function deleteEnableBankingSessionRoute(
	fastify: FastifyInstance,
	opts: Options = {},
) {
	const sessionGateway = opts.sessionGateway ?? new EnableBankingClient();

	fastify.delete<{ Params: Params }>(
		'/enablebanking/sessions/:sessionId',
		{ schema: { params: Params } },
		async (request, reply) => {
			const { sessionId } = request.params;
			await deleteEnableBankingSession(sessionGateway, sessionId);
			return reply.status(204).send();
		},
	);
}
