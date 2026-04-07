const LHV_BASE_URL = "https://connect.lhv.eu";

export interface LhvTransaction {
	id: string;
	bookingDate: string;
	amount: number;
	currency: string;
	description: string;
	accountId: string;
}

function getDateRange(): { dateFrom: string; dateTo: string } {
	const to = new Date();
	const from = new Date();
	from.setDate(from.getDate() - 7);

	const fmt = (d: Date) => d.toISOString().split("T")[0];
	return { dateFrom: fmt(from), dateTo: fmt(to) };
}

export async function fetchLhvTransactions(): Promise<LhvTransaction[]> {
	const clientId = process.env.LHV_CLIENT_ID;
	const apiKey = process.env.LHV_API_KEY;

	if (!clientId || !apiKey) {
		throw new Error(
			"LHV_CLIENT_ID and LHV_API_KEY environment variables are required",
		);
	}

	const { dateFrom, dateTo } = getDateRange();
	const url = `${LHV_BASE_URL}/account-statement?dateFrom=${dateFrom}&dateTo=${dateTo}`;

	const response = await fetch(url, {
		headers: {
			"X-Client-Id": clientId,
			"X-Api-Key": apiKey,
			Accept: "application/json",
		},
	});

	if (!response.ok) {
		throw new Error(`LHV API error: ${response.status}`);
	}

	const data = (await response.json()) as { transactions: LhvTransaction[] };
	return data.transactions ?? [];
}
