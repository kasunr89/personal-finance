import { EventEmitter } from 'node:events';

export const transactionEvents = new EventEmitter();
export const TRANSACTIONS_SYNCED = 'transactions.synced';
