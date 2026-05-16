import fs from 'fs';
import jwt from 'jsonwebtoken';
import type { BankSession, Transaction } from '../../domain/types.js';
import type { EnableBankingSessionGateway } from '../../ports/enablebanking-session-gateway.js';
import type { EnableBankingTransactionGateway } from '../../ports/enablebanking-transaction-gateway.js';
import type { EnableBankingRawTransaction } from '../types/enablebanking-raw-transaction.js';
import { mapRawTransaction } from '../mappers/enablebanking-transaction.js';

const API_BASE = 'https://api.enablebanking.com';

interface EnableBankingSession {
	status: string;
	accounts: string[];
	accounts_data: Array<{
		uid: string;
		identification_hash: string;
		identification_hashes: string[];
	}>;
	aspsp: { name: string; country: string };
	psu_type: string;
	psu_id_hash: string;
	access: {
		accounts: string[] | null;
		balances: boolean;
		transactions: boolean;
		valid_until: string;
	};
	created: string;
	authorized: string | null;
	closed: string | null;
}


function toBankSession(raw: EnableBankingSession): BankSession {
	return {
		status: raw.status,
		accounts: raw.accounts,
		accountsData: raw.accounts_data.map((a) => ({
			uid: a.uid,
			identificationHash: a.identification_hash,
		})),
		validUntil: raw.access.valid_until,
	};
}

export class EnableBankingClient implements EnableBankingSessionGateway, EnableBankingTransactionGateway {
	private makeJwt(): string {
		const appId = process.env.ENABLEBANKING_APP_ID;
		const keyContent = process.env.ENABLEBANKING_PRIVATE_KEY;
		const keyPath = process.env.ENABLEBANKING_PRIVATE_KEY_PATH;

		if (!appId || (!keyContent && !keyPath)) {
			throw new Error(
				'ENABLEBANKING_APP_ID and either ENABLEBANKING_PRIVATE_KEY or ENABLEBANKING_PRIVATE_KEY_PATH are required',
			);
		}

		const privateKey = keyContent ? keyContent.replace(/\\n/g, '\n') : fs.readFileSync(keyPath!);
		const now = Math.floor(Date.now() / 1000);

		return jwt.sign(
			{
				iss: 'enablebanking.com',
				aud: 'api.enablebanking.com',
				iat: now,
				exp: now + 3600,
			},
			privateKey,
			{
				algorithm: 'RS256',
				header: { typ: 'JWT', alg: 'RS256', kid: appId },
			},
		);
	}

	private async apiRequest(
		method: string,
		path: string,
		body?: unknown,
	): Promise<unknown> {
		const token = this.makeJwt();
		const response = await fetch(`${API_BASE}${path}`, {
			method,
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			body: body ? JSON.stringify(body) : undefined,
		});

		if (!response.ok) {
			const text = await response.text();
			throw new Error(
				`Enable Banking API error ${response.status}: ${text}`,
			);
		}

		return response.json();
	}

	async startAuth(
		redirectUrl: string,
		validUntil: string,
	): Promise<{ url: string }> {
		const name = process.env.ENABLEBANKING_ASPSP_NAME;
		const country = process.env.ENABLEBANKING_ASPSP_COUNTRY;
		if (!name || !country) {
			throw new Error(
				'ENABLEBANKING_ASPSP_NAME and ENABLEBANKING_ASPSP_COUNTRY are required',
			);
		}
		return (await this.apiRequest('POST', '/auth', {
			access: { valid_until: validUntil },
			aspsp: { name, country },
			state: crypto.randomUUID(),
			redirect_url: redirectUrl,
			psu_type: 'personal',
			psu_headers: { 'psu-ip-address': '127.0.0.1' },
		})) as { url: string };
	}

	async createSession(code: string): Promise<BankSession> {
		const raw = (await this.apiRequest('POST', '/sessions', {
			code,
		})) as EnableBankingSession;
		return toBankSession(raw);
	}

	async getSession(sessionId: string): Promise<BankSession> {
		const raw = (await this.apiRequest(
			'GET',
			`/sessions/${sessionId}`,
		)) as EnableBankingSession;
		return toBankSession(raw);
	}

	async deleteSession(sessionId: string): Promise<void> {
		await this.apiRequest('DELETE', `/sessions/${sessionId}`);
	}

	async getAllTransactions(
		accountUid: string,
		dateFrom: string,
	): Promise<Transaction[]> {
const all: EnableBankingRawTransaction[] = [];
		let continuationKey: string | undefined;

		do {
			const params = new URLSearchParams({ date_from: dateFrom });
			if (continuationKey)
				params.set('continuation_key', continuationKey);

			const res = (await this.apiRequest(
				'GET',
				`/accounts/${accountUid}/transactions?${params}`,
			)) as {
				transactions: EnableBankingRawTransaction[];
				continuation_key?: string;
			};

			all.push(...res.transactions);
			continuationKey = res.continuation_key;
		} while (continuationKey);

		return all
			.filter((t) => ['BOOK', 'OTHR'].includes(t.status))
			.map((t) => mapRawTransaction(t, 'lhv'));
	}
}
