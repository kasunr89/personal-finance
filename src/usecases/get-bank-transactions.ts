import type { BankGateway } from '../ports/bank-gateway.js';
import type { Transaction } from '../domain/types.js';

export async function getBankTransactions(provider: BankGateway): Promise<Transaction[]> {
	return provider.getTransactions();
}
