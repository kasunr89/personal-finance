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

# Run DB migrations against DATABASE_URL
npm run migrate
```

## Architecture

This is a personal finance sync service. It runs as both a local Fastify server (`npm run dev`) and an AWS Lambda function (`src/infrastructure/lambda.ts` wraps the same Fastify app via `@fastify/aws-lambda`).

The code follows clean architecture with four layers:

```
domain/          → shared types (Transaction, StoredTransaction)
ports/           → interfaces (BankGateway, TransactionRepo, EnableBankingSessionGateway, EnableBankingTransactionGateway)
usecases/        → pure business logic, depends only on ports
adapters/        → concrete implementations of ports
  banks/enablebanking/ → EnableBankingAdapter: wraps a transaction client, implements BankGateway
  db/            → NeonTransactionRepo (Postgres via Kysely + @neondatabase/serverless)
infrastructure/  → Fastify app wiring, route handlers, Lambda entrypoint
  http/          → EnableBankingClient: real HTTP client (RS256 JWT auth), implements both EnableBankingSessionGateway and EnableBankingTransactionGateway
  file/          → FileEnableBankingClient: reads from data/*.json, implements EnableBankingTransactionGateway (sandbox mode)
  mappers/       → maps raw Enable Banking API responses to domain Transaction
```

**Data flow for a sync:** route handler → `syncTransactions(bankGateway, repo)` usecase → `bankGateway.getTransactions()` → `repo.upsert(transactions)`.

**Sandbox mode:** When the server starts with `sandbox: true`, the sync route uses `FileEnableBankingClient` (reads `data/transactions-2026-04-01.json`) instead of calling the real Enable Banking API.

**Enable Banking OAuth flow:**
1. Run `npx tsx scripts/authorize-enablebanking.ts` — opens the bank auth URL in the browser
2. The running dev server handles `GET /callback?code=...`, exchanges the code for a session, and returns `{ session_id, accounts }` as JSON
3. Save `ENABLEBANKING_SESSION_ID` and account UIDs to `.env`

## API routes

| Prefix | Route | Description |
|---|---|---|
| (none) | `GET /callback` | OAuth redirect handler; exchanges code for Enable Banking session |
| `/auth` | `GET /enablebanking-start` | Initiates OAuth auth flow, returns redirect URL |
| `/api/v1_internal` | `POST /sync-enablebanking` | Sync transactions (bearer token required) |
| `/api/v1_internal` | `GET /transactions` | Fetch stored transactions from DB |
| `/api/v1_internal` | `GET /sync-enablebanking` (session) | Get Enable Banking session details |
| `/api/v1_internal` | `DELETE /sync-enablebanking` (session) | Delete Enable Banking session |
| `/api/v1_internal` | `GET /enablebanking-transactions` | Fetch raw transactions from Enable Banking API |

## Key environment variables

| Variable | Used by |
|---|---|
| `DATABASE_URL` | NeonTransactionRepo |
| `ENABLEBANKING_APP_ID`, `ENABLEBANKING_PRIVATE_KEY_PATH` | EnableBankingClient (RS256 JWT signing) |
| `ENABLEBANKING_SESSION_ID` | EnableBankingClient |
| `ENABLEBANKING_ASPSP_NAME`, `ENABLEBANKING_ASPSP_COUNTRY` | EnableBankingClient `startAuth` (e.g. `LHV Pank`, `EE`) |
| `SYNC_SECRET` | `POST /api/v1_internal/sync-enablebanking` bearer token guard |
| `OPENAI_API_KEY` | `OpenAiClient` (transaction categorization) |

## Testing

Tests use Node's built-in `node:test` runner with `node:assert/strict`. No Jest or Vitest. All dependencies are injected via constructor/argument, so tests pass mock implementations of `BankGateway` and `TransactionRepo` directly — no module mocking needed.

## TypeScript notes

Module resolution is `Node16`, so all local imports must use `.js` extensions (even for `.ts` source files). esbuild bundles for Lambda — the TypeScript compiler is not used for builds, only for type checking.
