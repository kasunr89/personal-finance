import OpenAI from 'openai';
import type { TransactionCategoryGateway } from '../../ports/transaction-category-gateway.js';
import type { UncategorizedTransaction, CategoryResult } from '../../domain/types.js';

function buildSystemPrompt(mainAccount: string | undefined, ownAccounts: string | undefined): string {
	const accountsBlock = ownAccounts
		? `${ownAccounts
				.split(',')
				.map((entry) => {
					const [name, iban] = entry.split(':');
					return `${name.trim()} (${iban?.trim() ?? ''})`;
				})
				.join(', ')}\n\n`
		: '';

	return `You are a personal finance categorization assistant.

Type convention: 'debit' means money received (income), 'credit' means money spent (expense).

Main bank account: ${mainAccount}
My other accounts: ${accountsBlock}

Analyze creditor and debitor iban to identify transfer between my accounts when classifying.

Classify each transaction into one of these categories and subcategories:
- Income: Salary, Parking Rental, Refunds
- Housing: Mortgage Principal, Mortgage Interest, Utilities, Insurance
- Savings & Investments: Micro-savings, Recurring Savings, Growth Account
- Food: Groceries, Food Delivery, Dining Out
- Transport: Ride-hailing, Parking, Public Transport
- Health: Gym, Medical, Dental
- Entertainment: Streaming, Sports & Leisure, Nightlife
- Banking Fees: Card Fees, ATM Fees, Account Fees
- Transfers: Wise Transfer, LHV Internal Transfer
- Taxes: Income Tax

Return ONLY a valid JSON array with no extra text, markdown, or explanation:
[{ "id": <number>, "category": "<main category>", "sub_category": "<subcategory>" }]`;
}

export class OpenAiClient implements TransactionCategoryGateway {
	private client: OpenAI;
	private systemPrompt: string;

	constructor(apiKey?: string) {
		this.client = new OpenAI({
			apiKey: apiKey ?? process.env.OPENAI_API_KEY,
		});
		this.systemPrompt = buildSystemPrompt(process.env.MAIN_ACCOUNT, process.env.OWN_ACCOUNTS);
	}

	async categorize(transactions: UncategorizedTransaction[]): Promise<CategoryResult[]> {
		const response = await this.client.chat.completions.create({
			model: 'gpt-4o-mini',
			messages: [
				{ role: 'system', content: this.systemPrompt },
				{ role: 'user', content: JSON.stringify(transactions) },
			],
		});

		const text = response.choices[0]?.message?.content;
		if (!text) return [];
		return JSON.parse(text) as CategoryResult[];
	}
}
