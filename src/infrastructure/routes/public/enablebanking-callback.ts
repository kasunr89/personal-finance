import type { FastifyInstance } from 'fastify';
import { EnableBankingAuthAdapter } from '../../../adapters/banks/enablebanking/enablebanking-auth-adapter.js';
import type { EnableBankingAuthProvider } from '../../../ports/enablebanking-auth-provider.js';
import { EnableBankingHttpClient } from '../../http/enablebanking-http-client.js';

interface Options {
	provider?: EnableBankingAuthProvider;
}

export async function enableBankingCallbackRoute(
	fastify: FastifyInstance,
	opts: Options = {},
) {
	const provider =
		opts.provider ??
		new EnableBankingAuthAdapter(new EnableBankingHttpClient());

	fastify.get('/callback', async (request, reply) => {
		const { code } = request.query as { code?: string };

		if (!code) {
			return reply.status(400).send({ error: 'Missing code parameter' });
		}

		const session = await provider.createSession(code);

		return reply.send({
			accounts: session.accounts,
			accounts_data: session.accounts_data,
		});
	});
}
