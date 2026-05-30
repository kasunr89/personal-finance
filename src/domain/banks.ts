export const BANKS = {
	lhv:  { name: 'LHV Pank', country: 'EE' },
	wise: { name: 'Wise',     country: 'EE' },
} as const;

export type ConnectorKey = keyof typeof BANKS;

export function connectorFromName(name: string): ConnectorKey | undefined {
	return (Object.keys(BANKS) as ConnectorKey[]).find((k) => BANKS[k].name === name);
}
