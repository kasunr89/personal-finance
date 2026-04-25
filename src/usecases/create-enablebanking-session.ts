import type { BankSession } from '../domain/types.js';
import type { EnableBankingAuthProvider } from '../ports/enablebanking-auth-provider.js';

export async function createEnableBankingSession(
	provider: EnableBankingAuthProvider,
	code: string,
): Promise<BankSession> {
	return provider.createSession(code);
}
