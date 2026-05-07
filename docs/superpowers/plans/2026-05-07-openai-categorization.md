# OpenAI Categorization Switch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Anthropic SDK categorization client with OpenAI (`gpt-4o-mini`) and rename the `CategoryClient` port to `TransactionCategoryGateway`.

**Architecture:** The `CategoryClient` port is renamed to `TransactionCategoryGateway` to align with the codebase's Gateway naming convention. A new `OpenAiClient` class implementing this interface replaces `AnthropicCategoryClient` in the infrastructure layer. The usecase, DB layer, and test logic are unchanged — only type references and wiring are updated.

**Tech Stack:** `openai` npm package, Node16 module resolution (`.js` extensions on all local imports)

---

### Task 1: Rename port `CategoryClient` → `TransactionCategoryGateway`

**Files:**
- Create: `src/ports/transaction-category-gateway.ts`
- Delete: `src/ports/category-client.ts`
- Modify: `src/usecases/categorize-transactions.ts`
- Modify: `src/infrastructure/routes/internal/post-categorize-transactions.ts`
- Modify: `src/infrastructure/routes/internal/post-sync-enablebanking.ts`
- Modify: `__tests__/usecases/categorize-transactions.test.ts`
- Modify: `__tests__/routes/internal/post-categorize-transactions.test.ts`
- Modify: `__tests__/routes/internal/post-sync-enablebanking.test.ts`

- [ ] **Step 1: Create new port file**

Create `src/ports/transaction-category-gateway.ts`:

```typescript
import type { UncategorizedTransaction, CategoryResult } from '../domain/types.js';

export interface TransactionCategoryGateway {
	/**
	 * Categorize a batch of transactions in one API call.
	 * May return fewer results than input if the AI skips ambiguous transactions.
	 */
	categorize(transactions: UncategorizedTransaction[]): Promise<CategoryResult[]>;
}
```

- [ ] **Step 2: Update usecase import**

In `src/usecases/categorize-transactions.ts`, replace:

```typescript
import type { CategoryClient } from '../ports/category-client.js';

export async function categorizeTransactions(
	repo: TransactionRepo,
	client: CategoryClient,
```

with:

```typescript
import type { TransactionCategoryGateway } from '../ports/transaction-category-gateway.js';

export async function categorizeTransactions(
	repo: TransactionRepo,
	client: TransactionCategoryGateway,
```

- [ ] **Step 3: Update post-categorize-transactions route**

In `src/infrastructure/routes/internal/post-categorize-transactions.ts`, replace:

```typescript
import type { CategoryClient } from '../../../ports/category-client.js';
import { NeonTransactionRepo } from '../../../adapters/db/neon-transaction-repo.js';
import { AnthropicCategoryClient } from '../../ai/anthropic-client.js';
```

with:

```typescript
import type { TransactionCategoryGateway } from '../../../ports/transaction-category-gateway.js';
import { NeonTransactionRepo } from '../../../adapters/db/neon-transaction-repo.js';
import { AnthropicCategoryClient } from '../../ai/anthropic-client.js';
```

And replace the `Options` interface:

```typescript
interface Options {
	repo?: TransactionRepo;
	categoryClient?: CategoryClient;
}
```

with:

```typescript
interface Options {
	repo?: TransactionRepo;
	categoryClient?: TransactionCategoryGateway;
}
```

- [ ] **Step 4: Update post-sync-enablebanking route**

In `src/infrastructure/routes/internal/post-sync-enablebanking.ts`, replace:

```typescript
import type { CategoryClient } from '../../../ports/category-client.js';
```

with:

```typescript
import type { TransactionCategoryGateway } from '../../../ports/transaction-category-gateway.js';
```

And replace the `Options` interface:

```typescript
interface Options {
	sandbox?: boolean;
	bankGateway?: BankGateway;
	repo?: TransactionRepo;
	categoryClient?: CategoryClient;
}
```

with:

```typescript
interface Options {
	sandbox?: boolean;
	bankGateway?: BankGateway;
	repo?: TransactionRepo;
	categoryClient?: TransactionCategoryGateway;
}
```

- [ ] **Step 5: Update usecase test**

In `__tests__/usecases/categorize-transactions.test.ts`, replace:

```typescript
import type { CategoryClient } from '../../src/ports/category-client.js';
```

with:

```typescript
import type { TransactionCategoryGateway } from '../../src/ports/transaction-category-gateway.js';
```

Replace all occurrences of `CategoryClient` with `TransactionCategoryGateway` in that file:

```typescript
function makeClient(results: CategoryResult[] = aiResults): TransactionCategoryGateway {
```

```typescript
	const client: TransactionCategoryGateway = {
```

- [ ] **Step 6: Update post-categorize-transactions test**

In `__tests__/routes/internal/post-categorize-transactions.test.ts`, replace:

```typescript
import type { CategoryClient } from '../../../src/ports/category-client.js';
```

with:

```typescript
import type { TransactionCategoryGateway } from '../../../src/ports/transaction-category-gateway.js';
```

Replace:

```typescript
const mockCategoryClient: CategoryClient = {
```

with:

```typescript
const mockCategoryClient: TransactionCategoryGateway = {
```

- [ ] **Step 7: Update post-sync-enablebanking test**

In `__tests__/routes/internal/post-sync-enablebanking.test.ts`, replace:

```typescript
import type { CategoryClient } from '../../../src/ports/category-client.js';
```

with:

```typescript
import type { TransactionCategoryGateway } from '../../../src/ports/transaction-category-gateway.js';
```

Replace:

```typescript
const mockCategoryClient: CategoryClient = {
```

with:

```typescript
const mockCategoryClient: TransactionCategoryGateway = {
```

- [ ] **Step 8: Delete old port file**

```bash
rm src/ports/category-client.ts
```

- [ ] **Step 9: Run all tests**

```bash
npm test
```

Expected: all tests pass (behavior unchanged, only type references updated).

- [ ] **Step 10: Commit**

```bash
git add src/ports/transaction-category-gateway.ts src/usecases/categorize-transactions.ts src/infrastructure/routes/internal/post-categorize-transactions.ts src/infrastructure/routes/internal/post-sync-enablebanking.ts __tests__/usecases/categorize-transactions.test.ts __tests__/routes/internal/post-categorize-transactions.test.ts __tests__/routes/internal/post-sync-enablebanking.test.ts
git rm src/ports/category-client.ts
git commit -m "refactor: rename CategoryClient port to TransactionCategoryGateway"
```

---

### Task 2: Swap npm dependencies

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install openai and uninstall @anthropic-ai/sdk**

```bash
npm install openai && npm uninstall @anthropic-ai/sdk
```

Expected: `package.json` now contains `"openai"` and no longer contains `"@anthropic-ai/sdk"`.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: swap @anthropic-ai/sdk for openai"
```

---

### Task 3: Add `OpenAiClient` and remove `AnthropicCategoryClient`

**Files:**
- Create: `src/infrastructure/ai/openai-client.ts`
- Delete: `src/infrastructure/ai/anthropic-client.ts`
- Modify: `src/infrastructure/routes/internal/post-categorize-transactions.ts`
- Modify: `src/infrastructure/routes/internal/post-sync-enablebanking.ts`

- [ ] **Step 1: Create `OpenAiClient`**

Create `src/infrastructure/ai/openai-client.ts`:

```typescript
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
```

- [ ] **Step 2: Update post-categorize-transactions to use OpenAiClient**

In `src/infrastructure/routes/internal/post-categorize-transactions.ts`, replace:

```typescript
import { AnthropicCategoryClient } from '../../ai/anthropic-client.js';
```

with:

```typescript
import { OpenAiClient } from '../../ai/openai-client.js';
```

Replace:

```typescript
	const categoryClient = opts.categoryClient ?? new AnthropicCategoryClient();
```

with:

```typescript
	const categoryClient = opts.categoryClient ?? new OpenAiClient();
```

- [ ] **Step 3: Update post-sync-enablebanking to use OpenAiClient**

In `src/infrastructure/routes/internal/post-sync-enablebanking.ts`, replace:

```typescript
import { AnthropicCategoryClient } from '../../ai/anthropic-client.js';
```

with:

```typescript
import { OpenAiClient } from '../../ai/openai-client.js';
```

Replace:

```typescript
	const categoryClient = opts.categoryClient ?? new AnthropicCategoryClient();
```

with:

```typescript
	const categoryClient = opts.categoryClient ?? new OpenAiClient();
```

- [ ] **Step 4: Delete the Anthropic client**

```bash
rm src/infrastructure/ai/anthropic-client.ts
```

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/infrastructure/ai/openai-client.ts src/infrastructure/routes/internal/post-categorize-transactions.ts src/infrastructure/routes/internal/post-sync-enablebanking.ts
git rm src/infrastructure/ai/anthropic-client.ts
git commit -m "feat: replace AnthropicCategoryClient with OpenAiClient (gpt-4o-mini)"
```

---

### Task 4: Update docs

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update env vars table in CLAUDE.md**

In `CLAUDE.md`, add a new row to the Key environment variables table after the `SYNC_SECRET` row:

```
| `OPENAI_API_KEY` | `OpenAiClient` (transaction categorization) |
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update env vars table for OpenAI switch"
```
