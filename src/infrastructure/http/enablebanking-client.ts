import fs from 'fs';
import jwt from 'jsonwebtoken';
import type { BankSession, Transaction } from '../../domain/types.js';
import type { EnableBankingSessionGateway } from '../../ports/enablebanking-session-gateway.js';
import type { EnableBankingTransactionGateway } from '../../ports/enablebanking-transaction-gateway.js';
import type { EnableBankingRawTransaction } from '../types/enablebanking-raw-transaction.js';
import { mapRawTransaction } from '../mappers/enablebanking-transaction.js';

const API_BASE = 'https://api.enablebanking.com';

interface EnableBankingCreatedSession {
	session_id: string;
	accounts: Array<{
		uid: string;
		identification_hash: string;
		identification_hashes: string[];
		name?: string;
	}>;
	aspsp: { name: string; country: string };
	psu_type: string;
	access: {
		accounts: string[] | null;
		balances: boolean;
		transactions: boolean;
		valid_until: string;
	};
}

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

function createdSessionToBankSession(raw: EnableBankingCreatedSession): BankSession {
	return {
		id: raw.session_id,
		status: 'AUTHORIZED',
		accounts: raw.accounts.map((a) => a.uid),
		bankConnector: {
			name: raw.aspsp.name,
			country: raw.aspsp.country,
		},
		expireAt: raw.access.valid_until,
	};
}

function sessionToBankSession(id: BankSession['id'], raw: EnableBankingSession): BankSession {
	return {
		id,
		status: raw.status,
		accounts: raw.accounts,
		bankConnector: {
			name: raw.aspsp.name,
			country: raw.aspsp.country,
		},
		expireAt: raw.access.valid_until,
	};
}

export class EnableBankingClient implements EnableBankingSessionGateway, EnableBankingTransactionGateway {
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
		redirectUrl: string,
		validUntil: string,
		aspsp: { name: string; country: string },
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
		})) as EnableBankingCreatedSession;
		return createdSessionToBankSession(raw);
	}

	async getSession(sessionId: string): Promise<BankSession> {
		const raw = (await this.apiRequest(
			'GET',
			`/sessions/${sessionId}`,
		)) as EnableBankingSession;
		return sessionToBankSession(sessionId, raw);
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
			if (continuationKey) {
				params.set('continuation_key', continuationKey);
			}

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
