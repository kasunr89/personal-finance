import type { FastifyInstance } from 'fastify';
import { Type, type Static } from '@sinclair/typebox';
import { EnableBankingAuthAdapter } from '../../../adapters/banks/enablebanking/enablebanking-provider.js';
import type { EnableBankingAuthProvider } from '../../../ports/enablebanking-auth-provider.js';
import { getEnableBankingSession } from '../../../usecases/enablebanking-auth.js';

const Params = Type.Object({
    sessionId: Type.String(),
});

const Reply = Type.Object({
    status: Type.String(),
    accounts: Type.Array(Type.String()),
    accounts_data: Type.Array(
        Type.Object({
            uid: Type.String(),
            identification_hash: Type.String(),
            identification_hashes: Type.Array(Type.String()),
        }),
    ),
    aspsp: Type.Object({ name: Type.String(), country: Type.String() }),
    psu_type: Type.String(),
    psu_id_hash: Type.String(),
    access: Type.Object({
        accounts: Type.Union([Type.Array(Type.String()), Type.Null()]),
        balances: Type.Boolean(),
        transactions: Type.Boolean(),
        valid_until: Type.String(),
    }),
    created: Type.String(),
    authorized: Type.Union([Type.String(), Type.Null()]),
    closed: Type.Union([Type.String(), Type.Null()]),
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
    const provider = opts.provider ?? new EnableBankingAuthAdapter();

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
