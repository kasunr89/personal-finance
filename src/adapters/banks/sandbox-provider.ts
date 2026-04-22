import fs from 'fs';
import type { Transaction } from '../../domain/types.js';
import type { BankProvider } from '../../ports/bank-provider.js';

interface RawTransaction {
    entry_reference: string;
    transaction_id: string | null;
    booking_date: string;
    transaction_amount: { amount: string; currency: string };
    remittance_information: string;
}

export class SandboxBankProvider implements BankProvider {
    constructor(
        private readonly filePath: string,
        private readonly accountId: string,
    ) {}

    async fetchTransactions(): Promise<Transaction[]> {
        const raw: RawTransaction[] = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));

        return raw.map((t) => ({
            id: '',
            accountId: this.accountId,
            amount: parseFloat(t.transaction_amount.amount),
            currency: t.transaction_amount.currency,
            description: t.remittance_information[0] ?? null,
            bookingDate: t.booking_date,
            source: 'enablebanking',
            sourceId: t.transaction_id ?? t.entry_reference,
        }));
    }
}
