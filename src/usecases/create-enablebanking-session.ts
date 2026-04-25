import type { EnableBankingAuthProvider, EnableBankingSession } from '../ports/enablebanking-auth-provider.js';

export async function createEnableBankingSession(
	provider: EnableBankingAuthProvider,
	code: string,
): Promise<EnableBankingSession> {
	return provider.createSession(code);
}
