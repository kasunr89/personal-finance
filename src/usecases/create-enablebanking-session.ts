import type { BankSession } from '../domain/types.js';
import type { EnableBankingSessionGateway } from '../ports/enablebanking-session-gateway.js';

export async function createEnableBankingSession(
	sessionGateway: EnableBankingSessionGateway,
	code: string,
): Promise<BankSession> {
	return sessionGateway.createSession(code);
}
