import type { BankProvider } from '../ports/bank-provider.js';
import type { Transaction } from '../domain/types.js';

export async function getBankTransactions(provider: BankProvider): Promise<Transaction[]> {
	return provider.getTransactions();
}
