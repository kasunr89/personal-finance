import type { ConnectorKey } from '../domain/banks.js';
import type { Transaction } from '../domain/types.js';

export interface EnableBankingTransactionGateway {
	getAllTransactions(accountUid: string, dateFrom: string, source: ConnectorKey): Promise<Transaction[]>;
}
