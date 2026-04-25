import type { BankSession } from '../../../domain/types.js';
import type { EnableBankingAuthProvider } from '../../../ports/enablebanking-auth-provider.js';
import type { EnableBankingGateway } from '../../../ports/enablebanking-gateway.js';

export class EnableBankingAuthAdapter implements EnableBankingAuthProvider {
	private readonly aspsp: { name: string; country: string };

	constructor(private client: EnableBankingGateway) {
		const name = process.env.ENABLEBANKING_ASPSP_NAME;
		const country = process.env.ENABLEBANKING_ASPSP_COUNTRY;
		if (!name || !country) {
			throw new Error(
				'ENABLEBANKING_ASPSP_NAME and ENABLEBANKING_ASPSP_COUNTRY are required',
			);
		}
		this.aspsp = { name, country };
	}

	async startAuth(
		redirectUrl: string,
		validUntil: string,
	): Promise<{ url: string }> {
		return this.client.startAuth(this.aspsp, redirectUrl, validUntil);
	}

	async createSession(code: string): Promise<BankSession> {
		return this.client.createSession(code);
	}

	async getSession(sessionId: string): Promise<BankSession> {
		return this.client.getSession(sessionId);
	}

	async deleteSession(sessionId: string): Promise<void> {
		return this.client.deleteSession(sessionId);
	}
}
