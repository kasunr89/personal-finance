import type { BankGateway } from '../ports/bank-gateway.js';
import type { Transaction } from '../domain/types.js';

export async function getBankTransactions(bankGateway: BankGateway): Promise<Transaction[]> {
	return bankGateway.getTransactions();
}
