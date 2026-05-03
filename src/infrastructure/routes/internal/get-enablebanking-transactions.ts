import type { FastifyInstance } from 'fastify';
import { Type, type Static } from '@sinclair/typebox';
import { EnableBankingAdapter } from '../../../adapters/banks/enablebanking/enablebanking-adapter.js';
import type { BankGateway } from '../../../ports/bank-gateway.js';
import { EnableBankingClient } from '../../http/enablebanking-client.js';
import { FileEnableBankingClient } from '../../file/file-enablebanking-client.js';
import { getBankTransactions } from '../../../usecases/get-bank-transactions.js';

const Params = Type.Object({
	accountId: Type.String({ minLength: 1 }),
});

const Query = Type.Object({
	date_from: Type.Optional(Type.String()),
});

const TransactionReply = Type.Object({
	referenceId: Type.String(),
	amount: Type.Object({
		value: Type.Number(),
		currency: Type.String(),
	}),
	source: Type.Union([
		Type.Literal('SANDBOX'),
		Type.Literal('ENABLEBANKING'),
		Type.Literal('WISE'),
	]),
	creditor: Type.Object({
		name: Type.String(),
		iban: Type.String(),
	}),
	debitor: Type.Object({
		name: Type.String(),
		iban: Type.String(),
	}),
	type: Type.Union([Type.Literal('CREDIT'), Type.Literal('DEBIT')]),
	status: Type.String(),
	date: Type.String(),
	description: Type.String(),
});

const Reply = Type.Array(TransactionReply);

type Params = Static<typeof Params>;
type Query = Static<typeof Query>;
type Reply = Static<typeof Reply>;

interface Options {
	sandbox?: boolean;
	provider?: BankGateway;
}

export async function getEnableBankingTransactionsRoute(
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
				new EnableBankingAdapter(
					opts.sandbox
						? new FileEnableBankingClient('data/transations.json')
						: new EnableBankingClient(),
					accountId,
					dateFrom,
				);
			const transactions = await getBankTransactions(bankProvider);

			return reply.send(transactions);
		},
	);
}
