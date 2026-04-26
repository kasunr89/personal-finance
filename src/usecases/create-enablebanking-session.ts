import type { BankSession } from '../domain/types.js';
import type { EnableBankingSessionGateway } from '../ports/enablebanking-session-gateway.js';

export async function createEnableBankingSession(
	provider: EnableBankingSessionGateway,
	code: string,
): Promise<BankSession> {
	return provider.createSession(code);
}
