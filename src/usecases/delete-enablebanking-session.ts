import type { EnableBankingAuthProvider } from '../ports/enablebanking-auth-provider.js';

export async function deleteEnableBankingSession(
	provider: EnableBankingAuthProvider,
	sessionId: string,
): Promise<void> {
	return provider.deleteSession(sessionId);
}
