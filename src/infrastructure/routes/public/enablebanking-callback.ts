import type { FastifyInstance } from 'fastify';
import { EnableBankingAuthAdapter } from '../../../adapters/banks/enablebanking/enablebanking-auth-adapter.js';
import type { EnableBankingAuthProvider } from '../../../ports/enablebanking-auth-provider.js';
import { EnableBankingHttpClient } from '../../http/enablebanking-http-client.js';
import { createEnableBankingSession } from '../../../usecases/create-enablebanking-session.js';

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

		const session = await createEnableBankingSession(provider, code);

		return reply.send({
			accounts: session.accounts,
			accountsData: session.accountsData,
		});
	});
}
