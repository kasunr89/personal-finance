import type { FastifyInstance } from "fastify";
import type { fetchLhvTransactions as FetchLhvTransactions } from "../lhv-client.js";
import type { sql as SqlType } from "../db.js";

// Dependencies injected via opts for testability (Node v20 does not support mock.module with tsx/ESM).
// In test environments where DATABASE_URL is absent, opts.sql MUST be provided or the dynamic import
// will throw at plugin registration time.
interface SyncLhvOptions {
	fetchTransactions?: typeof FetchLhvTransactions;
	sql?: typeof SqlType;
}

export async function syncLhvRoute(
	app: FastifyInstance,
	opts: SyncLhvOptions = {},
) {
	const fetch =
		opts.fetchTransactions ??
		(await import("../lhv-client.js")).fetchLhvTransactions;
	const sql = opts.sql ?? (await import("../db.js")).sql;

	app.get("/sync-lhv", async (_request, reply) => {
		let transactions;
		try {
			transactions = await fetch();
		} catch {
			return reply.status(503).send({ error: "LHV API unavailable" });
		}

		let synced = 0;
		try {
			for (const t of transactions) {
				const rows = await sql`
          INSERT INTO transactions (account_id, amount, currency, description, source, source_id, created_at)
          VALUES (${t.accountId}, ${t.amount}, ${t.currency}, ${t.description}, 'lhv', ${t.id}, ${t.bookingDate})
          ON CONFLICT (account_id, source, source_id) DO NOTHING
          RETURNING id
        `;
				synced += rows.length;
			}
		} catch {
			return reply.status(500).send({ error: "Database error" });
		}

		return reply.send({ synced });
	});
}
