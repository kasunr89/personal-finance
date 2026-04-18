# GET /transactions Endpoint Design

**Date:** 2026-04-18

## Goal

Expose stored transactions via a simple Fastify endpoint that returns all rows from the database.

## Approach

New dedicated route file following the existing pattern (`sync-lhv`, `sync-enablebanking`). No query params, no pagination — simple fetch.

## Changes

### 1. Fix `getTransactions` usecase (`src/usecases/sync-transactions.ts`)

Change return type from `Promise<void>` to `Promise<StoredTransaction[]>` and return the result from `repo.getTransactions()`.

### 2. New route (`src/infrastructure/routes/transactions.ts`)

`GET /transactions` — calls `getTransactions(repo)`, returns the array as JSON.

### 3. Register in app (`src/infrastructure/app.ts`)

Import and register the new route alongside the existing ones.

## Response shape

Array of `StoredTransaction` (snake_case, DB-native types):

```json
[
  {
    "id": 1,
    "account_id": "19032424",
    "amount": "12.39",
    "currency": "EUR",
    "description": "Bolt",
    "source": "LHV",
    "source_id": "12",
    "created_at": "2026-04-17T21:00:00.000Z"
  }
]
```

## Error handling

500 on unexpected DB errors (consistent with other sync routes).

## Out of scope

Filtering, pagination, date ranges — deferred until needed.
