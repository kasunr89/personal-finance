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

Analyse creditor and debitor name and IBAN to identify transfers between my own accounts.

Classify each transaction into one of these categories and subcategories:
- Income:
	- Salary: salary from Pipedrive
	- Parking Rental: monthly rental payment for parking
	- Income Tax Refunds: Yearly income tax refunds
- Housing:
	- Mortgage Principal: Home loan capital payments
	- Mortgage Interest: Home loan interest payments
	- Utilities: Utility bill payments
	- Insurance: House insurance payment
- Savings & Investments:
	- Micro-savings: Mirco savings deductions for every trasaction from main account to savings account
	- Recurring Savings: Monthly savings transfer from main account to savings account
	- Growth Account: Micro investment deductions from every trasaction from main account to growth account 
- Food:
	- Groceries: Payments for groceries
	- Food Delivery: Payments for food deliveries
	- Dining Out: Payments for dining out like restaurants
- Transport:
	- Ride-hailing: Ride hailing payments (eg: bolt drive)
- Health:
	- Gym: Gym membership
	- Dental: Payments for dentist visits
- Entertainment:
	- Streaming: Streaming subscriptions
	- Nightlife: Expenses of going out
- Banking Fees:
	- Card Fees: Monthly fees for debit cars
- Transfers:
	- Wise Self Transfer: Transfer to my wise account

Return Uncategorised in case there's a confusion of categorisation.`;
}

const FORMAT_JSON = `\n\nReturn ONLY a valid JSON array with no extra text, markdown, or explanation:
[{ "id": <number>, "category": "<main category>", "sub_category": "<subcategory>" }]`;

const FORMAT_JSON_WITH_REASON = `\n\nReturn ONLY a valid JSON array with no extra text, markdown, or explanation:
[{ "id": <number>, "category": "<main category>", "sub_category": "<subcategory>", "reason": "<one sentence explaining why>" }]`;

export class OpenAiClient implements TransactionCategoryGateway {
	private client: OpenAI;
	private systemPrompt: string;

	constructor(apiKey?: string) {
		this.client = new OpenAI({
			apiKey: apiKey ?? process.env.OPENAI_API_KEY,
		});
		this.systemPrompt = buildSystemPrompt(process.env.MAIN_ACCOUNT, process.env.OWN_ACCOUNTS);
	}

	async categorize(transactions: UncategorizedTransaction[], options: { includeReason?: boolean } = {}): Promise<CategoryResult[]> {
		const format = options.includeReason ? FORMAT_JSON_WITH_REASON : FORMAT_JSON;
		const response = await this.client.chat.completions.create({
			model: 'gpt-4o-mini',
			messages: [
				{ role: 'system', content: this.systemPrompt + format },
				{ role: 'user', content: JSON.stringify(transactions) },
			],
		});

		const text = response.choices[0]?.message?.content;
		if (!text) return [];
		return JSON.parse(text) as CategoryResult[];
	}
}
