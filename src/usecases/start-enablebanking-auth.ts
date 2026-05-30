import type { EnableBankingSessionGateway } from '../ports/enablebanking-session-gateway.js';
import type { SessionRepo } from '../ports/session-repo.js';
import { BANKS } from '../domain/banks.js';
import type { ConnectorKey } from '../domain/banks.js';
import { ActiveSessionExistsError, UnknownBankError } from '../domain/errors.js';

const ACCESS_DAYS = 90;

export async function startEnableBankingAuth(
	sessionGateway: EnableBankingSessionGateway,
	sessionRepo: SessionRepo,
	redirectUrl: string,
	bank: string,
): Promise<{ url: string }> {
	if (!(bank in BANKS)) {
		throw new UnknownBankError(bank);
	}

	const connector = bank as ConnectorKey;
	const sessions = await sessionRepo.getAll();
	const now = new Date();
	if (sessions.some((s) => s.connector === connector && s.expire_at > now)) {
		throw new ActiveSessionExistsError();
	}

	const aspsp = BANKS[connector];
	const validUntil = new Date(
		Date.now() + ACCESS_DAYS * 24 * 60 * 60 * 1000,
	).toISOString();
	return sessionGateway.startAuth(redirectUrl, validUntil, aspsp);
}
