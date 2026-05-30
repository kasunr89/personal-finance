import type { EnableBankingSessionGateway } from '../ports/enablebanking-session-gateway.js';
import type { SessionRepo } from '../ports/session-repo.js';

export async function deleteEnableBankingSession(
	sessionGateway: EnableBankingSessionGateway,
	sessionRepo: SessionRepo,
	sessionId: string,
): Promise<void> {
	await sessionGateway.deleteSession(sessionId);
	await sessionRepo.deleteById(sessionId);
}
