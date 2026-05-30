import type { BankSession } from '../domain/types.js';
import type { EnableBankingSessionGateway } from '../ports/enablebanking-session-gateway.js';
import type { SessionRepo } from '../ports/session-repo.js';
import { connectorFromName } from '../domain/banks.js';
import { UnknownBankConnectorError } from '../domain/errors.js';

export async function createEnableBankingSession(
	sessionGateway: EnableBankingSessionGateway,
	sessionRepo: SessionRepo,
	code: string,
): Promise<BankSession> {
	const session = await sessionGateway.createSession(code);

	console.log('Create enablebanking session', session);

	const connector = connectorFromName(session.bankConnector.name);
	if (!connector) {
		console.log('Unknown connector', session.bankConnector.name);

		throw new UnknownBankConnectorError(session.bankConnector.name);
	}

	const existingSessions = await sessionRepo.getByConnector(connector);

	for (const existingSession of existingSessions) {
		try {
			await sessionGateway.deleteSession(existingSession.id);
		} catch (e) {
			console.log(`Failed to delete session ${existingSession.id}`, e);
		}
		
	}

	await sessionRepo.deleteByConnector(connector);
	await sessionRepo.upsert({
		id: session.id,
		connector,
		expire_at: new Date(session.expireAt),
		accounts: session.accounts,
	});

	return session;
}
