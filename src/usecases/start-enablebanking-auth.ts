import type { EnableBankingSessionGateway } from '../ports/enablebanking-session-gateway.js';

const ACCESS_DAYS = 90;

export async function startEnableBankingAuth(
	provider: EnableBankingSessionGateway,
	redirectUrl: string,
): Promise<{ url: string }> {
	const validUntil = new Date(
		Date.now() + ACCESS_DAYS * 24 * 60 * 60 * 1000,
	).toISOString();
	return provider.startAuth(redirectUrl, validUntil);
}
