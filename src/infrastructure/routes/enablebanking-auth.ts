import fs from 'fs';
import type { FastifyInstance } from 'fastify';
import { EnableBankingProvider } from '../../adapters/banks/enablebanking/enablebanking-provider.js';
import type { BankProvider } from '../../ports/bank-provider.js';

interface EnableBankingAuthOptions {
	bankProvider?: BankProvider;
}

export async function enableBankingAuthRoute(
	app: FastifyInstance,
	opts: EnableBankingAuthOptions = {},
) {
	app.get('/auth/enablebanking/accounts/:accountId/transactions', async (request, reply) => {
		if (process.env.SANDBOX === 'true') {
			const data = JSON.parse(fs.readFileSync('data/transations.json', 'utf-8'));
			return reply.send(data);
		}

		const { accountId } = request.params as { accountId: string };
		const { date_from } = request.query as { date_from?: string };
		const dateFrom = date_from ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
		const bankProvider = opts.bankProvider ?? new EnableBankingProvider(accountId, dateFrom);
		const transactions = await bankProvider.fetchTransactions();
		return reply.send(transactions);
	});
}
