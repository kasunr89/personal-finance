# Clean Architecture Restructure

## Overview

Restructure the flat `src/` directory into a clean architecture layout with domain, ports, use cases, adapters, and infrastructure layers. This supports the growing number of bank integrations (LHV, Enable Banking, Wise) and future use cases (webhooks).

## Principles

- **Dependency rule:** Inner layers never depend on outer layers. Domain has no dependencies. Ports depend on domain. Use cases depend on ports and domain. Adapters implement ports. Infrastructure wires everything together.
- **Framework isolation:** Fastify, Neon, and bank-specific SDKs live only in the outermost layers (adapters, infrastructure).
- **One bank = one adapter:** Each bank integration is a self-contained implementation of `BankProvider`, owning its own auth and API logic.

## Directory Structure

```
src/
  domain/
    types.ts
  ports/
    bank-provider.ts
    transaction-repo.ts
  usecases/
    sync-transactions.ts
  adapters/
    banks/
      lhv/
        lhv-provider.ts
      enablebanking/
        enablebanking-provider.ts
      wise/
        wise-provider.ts
    db/
      neon-transaction-repo.ts
  infrastructure/
    routes/
      sync-lhv.ts
      sync-enablebanking.ts
      sync-wise.ts
    app.ts
    server.ts
    lambda.ts

__tests__/
  usecases/
    sync-transactions.test.ts
  adapters/
    banks/
      lhv-provider.test.ts
    db/
      neon-transaction-repo.test.ts
  routes/
    sync-lhv.test.ts
```

## Layer Details

### Domain (`src/domain/`)

Pure type definitions with zero external dependencies.

- **`types.ts`** — Canonical data shapes used across the application:
  - `Transaction`: `id`, `accountId`, `amount`, `currency`, `description`, `bookingDate`, `source` (bank identifier), `sourceId` (bank's own transaction ID)

### Ports (`src/ports/`)

Interfaces that define contracts for external communication. No implementations.

- **`bank-provider.ts`** — Contract every bank adapter must implement:
  ```ts
  interface BankProvider {
    fetchTransactions(): Promise<Transaction[]>
  }
  ```
  Each bank adapter handles its own auth and maps bank-specific responses to the canonical `Transaction` type.

- **`transaction-repo.ts`** — Contract for persisting transactions:
  ```ts
  interface TransactionRepo {
    upsert(transactions: Transaction[]): Promise<number>
  }
  ```
  Returns the count of newly inserted rows. Today implemented by Neon; swappable to any database.

### Use Cases (`src/usecases/`)

Application logic that orchestrates ports. Framework-agnostic.

- **`sync-transactions.ts`** — Core sync workflow:
  ```ts
  function syncTransactions(
    provider: BankProvider,
    repo: TransactionRepo
  ): Promise<{ synced: number }>
  ```
  Calls `provider.fetchTransactions()` to get normalized transactions, then `repo.upsert(transactions)` to persist them.

### Adapters (`src/adapters/`)

Implementations of port interfaces.

#### Banks (`src/adapters/banks/`)

Each bank adapter implements `BankProvider`:

- **`lhv/lhv-provider.ts`** — Auth via API key headers (`LHV_CLIENT_ID`, `LHV_API_KEY`). Fetches from LHV Connect API and maps to `Transaction[]`.
- **`enablebanking/enablebanking-provider.ts`** — Auth via JWT with RS256 private key. Manages sessions and pagination. Maps Enable Banking response to `Transaction[]`.
- **`wise/wise-provider.ts`** — Placeholder for Wise integration.

#### Database (`src/adapters/db/`)

- **`neon-transaction-repo.ts`** — Implements `TransactionRepo` using `@neondatabase/serverless`. Contains the `INSERT ... ON CONFLICT (account_id, source, source_id) DO NOTHING` upsert logic.

### Infrastructure (`src/infrastructure/`)

Framework-specific wiring. Thin glue connecting Fastify to use cases.

#### Routes (`src/infrastructure/routes/`)

Each route handler:
1. Instantiates the correct `BankProvider` adapter
2. Instantiates the `TransactionRepo` adapter
3. Calls `syncTransactions(provider, repo)`
4. Maps results/errors to HTTP responses (503 for bank API failures, 500 for DB errors)

- **`sync-lhv.ts`** — `GET /sync-lhv`
- **`sync-enablebanking.ts`** — `GET /sync-enablebanking`
- **`sync-wise.ts`** — `GET /sync-wise`

#### Entry Points

- **`app.ts`** — Builds Fastify instance, registers routes
- **`server.ts`** — Local dev entry point
- **`lambda.ts`** — AWS Lambda handler

### Tests (`__tests__/`)

Tests live outside `src/`, mirroring the source structure:

- **`usecases/sync-transactions.test.ts`** — Mocks both `BankProvider` and `TransactionRepo` ports
- **`adapters/banks/lhv-provider.test.ts`** — Tests LHV adapter (mock HTTP)
- **`adapters/db/neon-transaction-repo.test.ts`** — Tests DB adapter
- **`routes/sync-lhv.test.ts`** — Tests HTTP wiring via Fastify inject

## File Migration

| Current file | New location |
|---|---|
| `src/lhv-client.ts` | `src/adapters/banks/lhv/lhv-provider.ts` |
| `src/enablebanking-client.ts` | `src/adapters/banks/enablebanking/enablebanking-provider.ts` |
| `src/db.ts` | `src/adapters/db/neon-transaction-repo.ts` |
| `src/routes/sync-lhv.ts` | `src/infrastructure/routes/sync-lhv.ts` |
| `src/app.ts` | `src/infrastructure/app.ts` |
| `src/server.ts` | `src/infrastructure/server.ts` |
| `src/lambda.ts` | `src/infrastructure/lambda.ts` |
| N/A (new) | `src/domain/types.ts` |
| N/A (new) | `src/ports/bank-provider.ts` |
| N/A (new) | `src/ports/transaction-repo.ts` |
| N/A (new) | `src/usecases/sync-transactions.ts` |
| `src/__tests__/lhv-client.test.ts` | `__tests__/adapters/banks/lhv-provider.test.ts` |
| `src/__tests__/sync-lhv.test.ts` | `__tests__/routes/sync-lhv.test.ts` |

## Future Extensibility

- **New bank:** Add a folder under `src/adapters/banks/` implementing `BankProvider`, add a route in `src/infrastructure/routes/`.
- **Webhooks:** Add a new use case in `src/usecases/` (e.g., `handle-webhook.ts`), reusing the same `TransactionRepo` port. Add webhook routes in infrastructure.
- **New database:** Implement `TransactionRepo` in a new adapter under `src/adapters/db/`.
