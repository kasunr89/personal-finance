import type { FastifyInstance } from 'fastify';
import { Type, type Static } from '@sinclair/typebox';
import { EnableBankingAuthAdapter } from '../../../adapters/banks/enablebanking/enablebanking-auth-adapter.js';
import type { EnableBankingAuthProvider } from '../../../ports/enablebanking-auth-provider.js';
import { EnableBankingHttpClient } from '../../http/enablebanking-http-client.js';
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
	provider?: EnableBankingAuthProvider;
}

export async function enableBankingSessionRoute(
	fastify: FastifyInstance,
	opts: Options = {},
) {
	const provider =
		opts.provider ??
		new EnableBankingAuthAdapter(new EnableBankingHttpClient());

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
