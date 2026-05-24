import type { BankSession } from '../domain/types.js';
import type { EnableBankingSessionGateway } from '../ports/enablebanking-session-gateway.js';
import type { SessionRepo } from '../ports/session-repo.js';
import { bankKeyFromName } from '../domain/banks.js';
import { UnknownBankConnectorError } from '../domain/errors.js';

export async function createEnableBankingSession(
	sessionGateway: EnableBankingSessionGateway,
	sessionRepo: SessionRepo,
	code: string,
): Promise<BankSession> {
	const session = await sessionGateway.createSession(code);

	const bankKey = bankKeyFromName(session.bankConnector.name);
	if (!bankKey) {
		throw new UnknownBankConnectorError(session.bankConnector.name);
	}

	for (const s of await sessionRepo.getByBankKey(bankKey)) {
		await sessionGateway.deleteSession(s.id);
	}

	await sessionRepo.deleteByBankKey(bankKey);
	await sessionRepo.upsert({
		id: session.id,
		bank_key: bankKey,
		expire_at: new Date(session.expireAt),
		accounts: session.accounts,
	});

	return session;
}
