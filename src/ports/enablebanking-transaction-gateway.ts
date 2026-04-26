import type { Transaction } from '../domain/types.js';

export interface EnableBankingTransactionGateway {
	getAllTransactions(accountUid: string, dateFrom: string): Promise<Transaction[]>;
}
