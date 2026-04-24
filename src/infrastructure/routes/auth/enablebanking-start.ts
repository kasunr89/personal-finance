import type { FastifyInstance } from 'fastify';
import { EnableBankingAuthAdapter } from '../../../adapters/banks/enablebanking/enablebanking-auth-adapter.js';
import type { EnableBankingAuthProvider } from '../../../ports/enablebanking-auth-provider.js';
import { EnableBankingHttpClient } from '../../http/enablebanking-http-client.js';
import { startEnableBankingAuth } from '../../../usecases/enablebanking-auth.js';

interface Options {
	provider?: EnableBankingAuthProvider;
}

export async function enableBankingStartRoute(
	fastify: FastifyInstance,
	opts: Options = {},
) {
	const provider =
		opts.provider ??
		new EnableBankingAuthAdapter(new EnableBankingHttpClient());

	fastify.get('/enablebanking/start', async (_request, reply) => {
		const redirectUrl = `${process.env.REDIRECT_HOST}/callback`;
		const result = await startEnableBankingAuth(provider, redirectUrl);
		return reply.send(result);
	});
}
