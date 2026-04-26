import type { FastifyInstance } from 'fastify';
import { Type, type Static } from '@sinclair/typebox';
import { EnableBankingAdapter } from '../../../adapters/banks/enablebanking/enablebanking-adapter.js';
import { SandboxBankProvider } from '../../../adapters/banks/sandbox-provider.js';
import type { BankProvider } from '../../../ports/bank-provider.js';
import { EnableBankingClient } from '../../http/enablebanking-client.js';
import { getBankTransactions } from '../../../usecases/get-bank-transactions.js';

const Params = Type.Object({
	accountId: Type.String({ minLength: 1 }),
});

const Query = Type.Object({
	date_from: Type.Optional(Type.String()),
});

const TransactionReply = Type.Object({
	id: Type.String(),
	accountId: Type.String(),
	amount: Type.Number(),
	currency: Type.String(),
	description: Type.Union([Type.String(), Type.Null()]),
	bookingDate: Type.String(),
	source: Type.String(),
	sourceId: Type.String(),
});

const Reply = Type.Array(TransactionReply);

type Params = Static<typeof Params>;
type Query = Static<typeof Query>;
type Reply = Static<typeof Reply>;

interface Options {
	sandbox?: boolean;
	provider?: BankProvider;
}

export async function enableBankingTransactionsRoute(
	fastify: FastifyInstance,
	opts: Options = {},
) {
	fastify.get<{ Params: Params; Querystring: Query; Reply: Reply }>(
		'/enablebanking/accounts/:accountId/transactions',
		{
			schema: {
				params: Params,
				querystring: Query,
				response: { 200: Reply },
			},
		},
		async (request, reply) => {
			const { accountId } = request.params;
			const { date_from } = request.query;
			const dateFrom =
				date_from ??
				new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
					.toISOString()
					.slice(0, 10);
			const bankProvider =
				opts.provider ??
				(opts.sandbox
					? new SandboxBankProvider(
							'data/transations.json',
							accountId,
						)
					: new EnableBankingAdapter(
							new EnableBankingClient(),
							accountId,
							dateFrom,
						));
			const transactions = await getBankTransactions(bankProvider);

			return reply.send(transactions);
		},
	);
}
