import type { EnableBankingSessionGateway } from '../ports/enablebanking-session-gateway.js';
import type { SessionRepo } from '../ports/session-repo.js';
import { BANKS } from '../domain/banks.js';
import type { BankKey } from '../domain/banks.js';
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

	const bankKey = bank as BankKey;
	const sessions = await sessionRepo.getAll();
	const now = new Date();
	if (sessions.some((s) => s.bank_key === bankKey && s.expire_at > now)) {
		throw new ActiveSessionExistsError();
	}

	const aspsp = BANKS[bankKey];
	const validUntil = new Date(
		Date.now() + ACCESS_DAYS * 24 * 60 * 60 * 1000,
	).toISOString();
	return sessionGateway.startAuth(redirectUrl, validUntil, aspsp);
}
