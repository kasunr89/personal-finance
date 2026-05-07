import OpenAI from 'openai';
import type { TransactionCategoryGateway } from '../../ports/transaction-category-gateway.js';
import type { UncategorizedTransaction, CategoryResult } from '../../domain/types.js';

const SYSTEM_PROMPT = `You are a personal finance categorization assistant.

Type convention: 'debit' means money received (income), 'credit' means money spent (expense).

Classify each transaction into one of these categories and subcategories:
- Income: Salary, Refunds
- Housing: Mortgage Principal, Mortgage Interest, Utilities, Insurance
- Savings & Investments: Micro-savings, Recurring Savings, Growth Account
- Food: Groceries, Food Delivery, Dining Out
- Transport: Ride-hailing, Parking, Public Transport
- Health: Gym, Medical, Dental
- Entertainment: Streaming, Sports & Leisure
- Banking Fees: Card Fees, ATM Fees, Account Fees
- Transfers: Wise, Personal Gifts
- Taxes: Income Tax

Return ONLY a valid JSON array with no extra text, markdown, or explanation:
[{ "id": <number>, "category": "<main category>", "sub_category": "<subcategory>" }]`;

export class OpenAiClient implements TransactionCategoryGateway {
	private client: OpenAI;

	constructor(apiKey?: string) {
		this.client = new OpenAI({
			apiKey: apiKey ?? process.env.OPENAI_API_KEY,
		});
	}

	async categorize(transactions: UncategorizedTransaction[]): Promise<CategoryResult[]> {
		const response = await this.client.chat.completions.create({
			model: 'gpt-4o-mini',
			messages: [
				{ role: 'system', content: SYSTEM_PROMPT },
				{ role: 'user', content: JSON.stringify(transactions) },
			],
		});

		const text = response.choices[0]?.message?.content;
		if (!text) return [];
		return JSON.parse(text) as CategoryResult[];
	}
}
