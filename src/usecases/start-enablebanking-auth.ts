import type { EnableBankingAuthProvider } from '../ports/enablebanking-auth-provider.js';

const ACCESS_DAYS = 90;

export async function startEnableBankingAuth(
	provider: EnableBankingAuthProvider,
	redirectUrl: string,
): Promise<{ url: string }> {
	const validUntil = new Date(
		Date.now() + ACCESS_DAYS * 24 * 60 * 60 * 1000,
	).toISOString();
	return provider.startAuth(redirectUrl, validUntil);
}
