import type { EnableBankingAuthProvider, EnableBankingSession } from '../ports/enablebanking-auth-provider.js';

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

export async function getEnableBankingSession(
	provider: EnableBankingAuthProvider,
	sessionId: string,
): Promise<EnableBankingSession> {
	return provider.getSession(sessionId);
}

export async function deleteEnableBankingSession(
	provider: EnableBankingAuthProvider,
	sessionId: string,
): Promise<void> {
	return provider.deleteSession(sessionId);
}

