import fs from 'fs';
import jwt from 'jsonwebtoken';
import type { EnableBankingSession } from '../../ports/enablebanking-auth-provider.js';
import type {
	EnableBankingHttpPort,
	EnableBankingTransaction,
} from '../../ports/enablebanking-http-port.js';

const API_BASE = 'https://api.enablebanking.com';

export class EnableBankingHttpClient implements EnableBankingHttpPort {
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

	async createSession(code: string): Promise<EnableBankingSession> {
		return (await this.apiRequest('POST', '/sessions', {
			code,
		})) as EnableBankingSession;
	}

	async getSession(sessionId: string): Promise<EnableBankingSession> {
		return (await this.apiRequest(
			'GET',
			`/sessions/${sessionId}`,
		)) as EnableBankingSession;
	}

	async deleteSession(sessionId: string): Promise<void> {
		await this.apiRequest('DELETE', `/sessions/${sessionId}`);
	}

	async fetchAllTransactions(
		accountUid: string,
		dateFrom: string,
	): Promise<EnableBankingTransaction[]> {
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

		return all;
	}
}
