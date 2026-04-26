import type { EnableBankingGateway } from '../ports/enablebanking-gateway.js';

export async function deleteEnableBankingSession(
	provider: EnableBankingGateway,
	sessionId: string,
): Promise<void> {
	return provider.deleteSession(sessionId);
}
