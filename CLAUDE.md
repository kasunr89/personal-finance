# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Local dev server (loads .env automatically)
npm run dev

# Run all tests
npm test

# Run a single test file
npx tsx --test __tests__/usecases/sync-transactions.test.ts

# Format code
npm run format

# Build Lambda bundle → dist/lambda.zip
npm run build
```

## Architecture

This is a personal finance sync service. It runs as both a local Fastify server (`npm run dev`) and an AWS Lambda function (`src/infrastructure/lambda.ts` wraps the same Fastify app via `@fastify/aws-lambda`).

The code follows clean architecture with four layers:

```
domain/          → shared types (Transaction, StoredTransaction)
ports/           → interfaces (BankProvider, TransactionRepo)
usecases/        → pure business logic, depends only on ports
adapters/        → concrete implementations of ports
  banks/lhv/     → fetches last 7 days from LHV REST API
  banks/enablebanking/ → OAuth-based Enable Banking client (JWT auth)
  db/            → NeonTransactionRepo (Postgres via @neondatabase/serverless)
infrastructure/  → Fastify app wiring, route handlers, Lambda entrypoint
```

**Data flow for a sync:** route handler → `syncTransactions(provider, repo)` usecase → `provider.fetchTransactions()` → `repo.upsert(transactions)`.

**Enable Banking OAuth flow:**
1. Run `npx tsx scripts/authorize-enablebanking.ts` — opens the bank auth URL in the browser
2. The running dev server handles `GET /callback?code=...`, exchanges the code for a session, and returns `{ session_id, accounts }` as JSON
3. Save `ENABLEBANKING_SESSION_ID` and account UIDs to `.env`

## Key environment variables

| Variable | Used by |
|---|---|
| `DATABASE_URL` | NeonTransactionRepo |
| `LHV_CLIENT_ID`, `LHV_API_KEY` | LhvProvider |
| `ENABLEBANKING_APP_ID`, `ENABLEBANKING_PRIVATE_KEY_PATH` | EnableBankingProvider (JWT signing) |
| `ENABLEBANKING_SESSION_ID` | EnableBankingProvider |

## Testing

Tests use Node's built-in `node:test` runner with `node:assert/strict`. No Jest or Vitest. All dependencies are injected via constructor/argument, so tests pass mock implementations of `BankProvider` and `TransactionRepo` directly — no module mocking needed.

## TypeScript notes

Module resolution is `Node16`, so all local imports must use `.js` extensions (even for `.ts` source files). esbuild bundles for Lambda — the TypeScript compiler is not used for builds, only for type checking.
