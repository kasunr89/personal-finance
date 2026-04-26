import type { EnableBankingGateway } from '../ports/enablebanking-gateway.js';

const ACCESS_DAYS = 90;

export async function startEnableBankingAuth(
	provider: EnableBankingGateway,
	redirectUrl: string,
): Promise<{ url: string }> {
	const validUntil = new Date(
		Date.now() + ACCESS_DAYS * 24 * 60 * 60 * 1000,
	).toISOString();
	return provider.startAuth(redirectUrl, validUntil);
}
