import type { BankSession } from '../domain/types.js';
import type { EnableBankingGateway } from '../ports/enablebanking-gateway.js';

export async function getEnableBankingSession(
	provider: EnableBankingGateway,
	sessionId: string,
): Promise<BankSession> {
	return provider.getSession(sessionId);
}
