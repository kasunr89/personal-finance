import type { FastifyInstance } from 'fastify';
import { Type, type Static } from '@sinclair/typebox';
import type { EnableBankingSessionGateway } from '../../../ports/enablebanking-session-gateway.js';
import { EnableBankingClient } from '../../http/enablebanking-client.js';
import { getEnableBankingSession } from '../../../usecases/get-enablebanking-session.js';

const Params = Type.Object({
	sessionId: Type.String(),
});

const Reply = Type.Object({
	status: Type.String(),
	accounts: Type.Array(Type.String()),
	accountsData: Type.Array(
		Type.Object({
			uid: Type.String(),
			identificationHash: Type.String(),
		}),
	),
	validUntil: Type.String(),
});

type Params = Static<typeof Params>;
type Reply = Static<typeof Reply>;

interface Options {
	provider?: EnableBankingSessionGateway;
}

export async function getEnableBankingSessionRoute(
	fastify: FastifyInstance,
	opts: Options = {},
) {
	const provider = opts.provider ?? new EnableBankingClient();

	fastify.get<{ Params: Params; Reply: Reply }>(
		'/enablebanking/sessions/:sessionId',
		{ schema: { params: Params, response: { 200: Reply } } },
		async (request, reply) => {
			const { sessionId } = request.params;
			const session = await getEnableBankingSession(provider, sessionId);
			return reply.send(session);
		},
	);
}
