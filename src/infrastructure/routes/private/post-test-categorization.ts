import type { FastifyInstance } from 'fastify';
import { Type, type Static } from '@sinclair/typebox';
import { OpenAiClient } from '../../ai/openai-client.js';

const Body = Type.Object({
	transactions: Type.Array(
		Type.Object({
			id: Type.Number(),
			description: Type.Union([Type.String(), Type.Null()]),
			type: Type.String(),
		}),
		{ minItems: 1 },
	),
});

type Body = Static<typeof Body>;

export async function postTestCategorizationRoute(
	fastify: FastifyInstance,
) {
	const secret = process.env.SYNC_SECRET;
	const client = new OpenAiClient();

	fastify.post<{ Body: Body }>(
		'/test-categorization',
		{ schema: { body: Body } },
		async (request, reply) => {
			const auth = request.headers.authorization;
			if (!secret || auth !== `Bearer ${secret}`) {
				return reply.status(401).send({ error: 'Unauthorized' });
			}

			try {
				const results = await client.categorize(request.body.transactions);
				return reply.send(results);
			} catch (err) {
				return reply.status(500).send({ error: 'OpenAI categorization failed' });
			}
		},
	);
}
