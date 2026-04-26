import type { BankSession } from '../domain/types.js';
import type { EnableBankingGateway } from '../ports/enablebanking-gateway.js';

export async function createEnableBankingSession(
	provider: EnableBankingGateway,
	code: string,
): Promise<BankSession> {
	return provider.createSession(code);
}
