import type { BankSession } from '../domain/types.js';
import type { EnableBankingAuthProvider } from '../ports/enablebanking-auth-provider.js';

export async function getEnableBankingSession(
	provider: EnableBankingAuthProvider,
	sessionId: string,
): Promise<BankSession> {
	return provider.getSession(sessionId);
}
