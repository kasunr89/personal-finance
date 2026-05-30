import type { ConnectorKey } from '../domain/banks.js';

export interface EnablebankingSession {
	id: string;
	connector: ConnectorKey;
	expire_at: Date;
	accounts: string[];
}

export interface SessionRepo {
	getAll(): Promise<EnablebankingSession[]>;
	getByConnector(connector: ConnectorKey): Promise<EnablebankingSession[]>;
	upsert(session: EnablebankingSession): Promise<void>;
	deleteByConnector(connector: ConnectorKey): Promise<void>;
}
