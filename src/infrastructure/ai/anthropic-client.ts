import Anthropic from '@anthropic-ai/sdk';
import type { CategoryClient } from '../../ports/category-client.js';
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

export class AnthropicCategoryClient implements CategoryClient {
	private client: Anthropic;

	constructor(apiKey?: string) {
		this.client = new Anthropic({
			apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY,
		});
	}

	async categorize(transactions: UncategorizedTransaction[]): Promise<CategoryResult[]> {
		const message = await this.client.messages.create({
			model: 'claude-haiku-4-5-20251001',
			max_tokens: 4096,
			system: SYSTEM_PROMPT,
			messages: [
				{
					role: 'user',
					content: JSON.stringify(transactions),
				},
			],
		});

		const block = message.content[0];
		if (block.type !== 'text') return [];
		return JSON.parse(block.text) as CategoryResult[];
	}
}
