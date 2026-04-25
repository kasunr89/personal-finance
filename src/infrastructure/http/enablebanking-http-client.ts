import fs from 'fs';
import jwt from 'jsonwebtoken';
import type { BankSession, Transaction } from '../../domain/types.js';
import type { EnableBankingGateway } from '../../ports/enablebanking-gateway.js';

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

interface EnableBankingTransaction {
	entry_reference: string;
	transaction_id: string | null;
	booking_date: string;
	transaction_amount: { amount: string; currency: string };
	remittance_information_unstructured: string;
	remittance_information: string[];
	credit_debit_indicator: string;
	creditor: { name: string | null } | null;
	debtor: { name: string | null } | null;
	[key: string]: unknown;
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

export class EnableBankingHttpClient implements EnableBankingGateway {
	private makeJwt(): string {
		const appId = process.env.ENABLEBANKING_APP_ID;
		const keyPath = process.env.ENABLEBANKING_PRIVATE_KEY_PATH;

		if (!appId || !keyPath) {
			throw new Error(
				'ENABLEBANKING_APP_ID and ENABLEBANKING_PRIVATE_KEY_PATH are required',
			);
		}

		const privateKey = fs.readFileSync(keyPath);
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
		aspsp: { name: string; country: string },
		redirectUrl: string,
		validUntil: string,
	): Promise<{ url: string }> {
		return (await this.apiRequest('POST', '/auth', {
			access: { valid_until: validUntil },
			aspsp,
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
		const all: EnableBankingTransaction[] = [];
		let continuationKey: string | undefined;

		do {
			const params = new URLSearchParams({ date_from: dateFrom });
			if (continuationKey)
				params.set('continuation_key', continuationKey);

			const res = (await this.apiRequest(
				'GET',
				`/accounts/${accountUid}/transactions?${params}`,
			)) as {
				transactions: EnableBankingTransaction[];
				continuation_key?: string;
			};

			all.push(...res.transactions);
			continuationKey = res.continuation_key;
		} while (continuationKey);

		return all.map(
			(t): Transaction => ({
				id: '',
				accountId: accountUid,
				amount: parseFloat(t.transaction_amount.amount),
				currency: t.transaction_amount.currency,
				description: t.remittance_information[0] ?? null,
				bookingDate: t.booking_date,
				source: 'enablebanking',
				sourceId: t.transaction_id ?? t.entry_reference,
			}),
		);
	}
}
