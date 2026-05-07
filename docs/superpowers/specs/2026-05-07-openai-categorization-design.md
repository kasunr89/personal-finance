# Switch Categorization to OpenAI

**Date:** 2026-05-07

## Goal

Replace the Anthropic SDK categorization implementation with OpenAI (`gpt-4o-mini`), and rename the port to follow the existing Gateway naming convention.

## Changes

### 1. Port rename

`src/ports/category-client.ts` → `src/ports/transaction-category-gateway.ts`

Interface renamed: `CategoryClient` → `TransactionCategoryGateway`

The `categorize(transactions: UncategorizedTransaction[]): Promise<CategoryResult[]>` method signature is unchanged. The rename aligns with the existing port naming convention (`BankGateway`, `EnableBankingSessionGateway`, etc.) and keeps the name technology-agnostic.

### 2. New implementation

`src/infrastructure/ai/openai-client.ts` — `OpenAiClient implements TransactionCategoryGateway`

- Uses the `openai` npm package
- Model: `gpt-4o-mini`
- Same system prompt as the current Anthropic implementation
- Reads `OPENAI_API_KEY` from environment

### 3. Remove Anthropic implementation

Delete `src/infrastructure/ai/anthropic-client.ts` and uninstall `@anthropic-ai/sdk`.

### 4. Update wiring

Both `post-categorize-transactions.ts` and `post-sync-enablebanking.ts` default to `new OpenAiClient()` instead of `new AnthropicCategoryClient()`.

### 5. Docs

Update `CLAUDE.md` env vars table: `ANTHROPIC_API_KEY` → `OPENAI_API_KEY`.

## What does not change

- `TransactionCategoryGateway` method signature
- `categorizeTransactions` usecase
- All tests (mock the interface, not the implementation — only type references update from `CategoryClient` to `TransactionCategoryGateway`)
- DB schema, migrations, routes structure

## Architecture

```
ports/transaction-category-gateway.ts   ← interface (domain-named, tech-agnostic)
        ↑ implements
infrastructure/ai/openai-client.ts      ← OpenAiClient (tech-named, infrastructure layer)
        ↑ injected into
usecases/categorize-transactions.ts     ← unchanged
routes/internal/post-categorize-transactions.ts  ← wires OpenAiClient as default
routes/internal/post-sync-enablebanking.ts       ← wires OpenAiClient as default
```
