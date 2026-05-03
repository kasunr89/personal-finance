import type { EnableBankingSessionGateway } from '../ports/enablebanking-session-gateway.js';

export async function deleteEnableBankingSession(
	sessionGateway: EnableBankingSessionGateway,
	sessionId: string,
): Promise<void> {
	return sessionGateway.deleteSession(sessionId);
}
