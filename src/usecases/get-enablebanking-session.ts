import type { BankSession } from '../domain/types.js';
import type { EnableBankingSessionGateway } from '../ports/enablebanking-session-gateway.js';

export async function getEnableBankingSession(
	provider: EnableBankingSessionGateway,
	sessionId: string,
): Promise<BankSession> {
	return provider.getSession(sessionId);
}
