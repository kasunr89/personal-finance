import createError from '@fastify/error';

export const ActiveSessionExistsError = createError(
	'ACTIVE_SESSION_EXISTS',
	'An active session already exists',
	409,
);

export const UnknownBankConnectorError = createError(
	'UNKNOWN_BANK_CONNECTOR',
	'Unknown bank connector: %s',
	400,
);

export const UnknownBankError = createError(
	'UNKNOWN_BANK',
	'Unknown bank: %s',
	400,
);
