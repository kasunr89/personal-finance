import type { EnableBankingAuthProvider, EnableBankingSession } from '../ports/enablebanking-auth-provider.js';

export async function getEnableBankingSession(
	provider: EnableBankingAuthProvider,
	sessionId: string,
): Promise<EnableBankingSession> {
	return provider.getSession(sessionId);
}
