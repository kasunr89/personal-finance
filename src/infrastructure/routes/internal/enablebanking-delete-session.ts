import type { FastifyInstance } from 'fastify';
import { Type, type Static } from '@sinclair/typebox';
import { EnableBankingAuthAdapter } from '../../../adapters/banks/enablebanking/enablebanking-auth-adapter.js';
import type { EnableBankingAuthProvider } from '../../../ports/enablebanking-auth-provider.js';
import { EnableBankingHttpClient } from '../../http/enablebanking-http-client.js';
import { deleteEnableBankingSession } from '../../../usecases/delete-enablebanking-session.js';

const Params = Type.Object({
	sessionId: Type.String(),
});

type Params = Static<typeof Params>;

interface Options {
	provider?: EnableBankingAuthProvider;
}

export async function enableBankingDeleteSessionRoute(
	fastify: FastifyInstance,
	opts: Options = {},
) {
	const provider =
		opts.provider ??
		new EnableBankingAuthAdapter(new EnableBankingHttpClient());

	fastify.delete<{ Params: Params }>(
		'/enablebanking/sessions/:sessionId',
		{ schema: { params: Params } },
		async (request, reply) => {
			const { sessionId } = request.params;
			await deleteEnableBankingSession(provider, sessionId);
			return reply.status(204).send();
		},
	);
}
