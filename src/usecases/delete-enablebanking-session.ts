import type { EnableBankingSessionGateway } from '../ports/enablebanking-session-gateway.js';

export async function deleteEnableBankingSession(
	provider: EnableBankingSessionGateway,
	sessionId: string,
): Promise<void> {
	return provider.deleteSession(sessionId);
}
