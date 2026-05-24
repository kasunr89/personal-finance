export const BANKS = {
	lhv:  { name: 'LHV Pank', country: 'EE' },
	wise: { name: 'Wise',     country: 'EE' },
} as const;

export type BankKey = keyof typeof BANKS;

export function bankKeyFromName(name: string): BankKey | undefined {
	return (Object.keys(BANKS) as BankKey[]).find((k) => BANKS[k].name === name);
}
