import type { BankSession } from '../domain/types.js';
import type { EnableBankingSessionGateway } from '../ports/enablebanking-session-gateway.js';

export async function getEnableBankingSession(
	sessionGateway: EnableBankingSessionGateway,
	sessionId: string,
): Promise<BankSession> {
	return sessionGateway.getSession(sessionId);
}
