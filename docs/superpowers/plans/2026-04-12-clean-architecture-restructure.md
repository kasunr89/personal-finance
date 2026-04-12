# Clean Architecture Restructure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the flat `src/` directory into a clean architecture with domain, ports, use cases, adapters, and infrastructure layers.

**Architecture:** Inner layers (domain, ports, use cases) have zero framework dependencies. Outer layers (adapters, infrastructure) implement interfaces and wire everything together. Each bank integration is a self-contained adapter behind a shared `BankProvider` interface.

**Tech Stack:** TypeScript 6, Fastify 5, Neon serverless, esbuild, `node:test` runner with `tsx`

---

## File Map

| File | Responsibility |
|---|---|
| `src/domain/types.ts` | Canonical `Transaction` type |
| `src/ports/bank-provider.ts` | `BankProvider` interface |
| `src/ports/transaction-repo.ts` | `TransactionRepo` interface |
| `src/usecases/sync-transactions.ts` | Orchestrates fetch + upsert |
| `src/adapters/banks/lhv/lhv-provider.ts` | LHV API client implementing `BankProvider` |
| `src/adapters/banks/enablebanking/enablebanking-provider.ts` | Enable Banking client implementing `BankProvider` |
| `src/adapters/db/neon-transaction-repo.ts` | Neon upsert implementing `TransactionRepo` |
| `src/infrastructure/routes/sync-lhv.ts` | Fastify route wiring for LHV |
| `src/infrastructure/routes/sync-enablebanking.ts` | Fastify route wiring for Enable Banking |
| `src/infrastructure/app.ts` | Fastify app builder |
| `src/infrastructure/server.ts` | Local dev entry point |
| `src/infrastructure/lambda.ts` | AWS Lambda handler |
| `__tests__/usecases/sync-transactions.test.ts` | Use case tests (mock ports) |
| `__tests__/adapters/banks/lhv-provider.test.ts` | LHV adapter tests (mock fetch) |
| `__tests__/routes/sync-lhv.test.ts` | Route integration tests (mock adapters) |

---

### Task 1: Create domain types

**Files:**
- Create: `src/domain/types.ts`

- [ ] **Step 1: Create `src/domain/types.ts`**

```ts
export interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  currency: string;
  description: string;
  bookingDate: string;
  source: string;
  sourceId: string;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/domain/types.ts
git commit -m "feat: add domain Transaction type"
```

---

### Task 2: Create port interfaces

**Files:**
- Create: `src/ports/bank-provider.ts`
- Create: `src/ports/transaction-repo.ts`

- [ ] **Step 1: Create `src/ports/bank-provider.ts`**

```ts
import type { Transaction } from '../domain/types.js';

export interface BankProvider {
  fetchTransactions(): Promise<Transaction[]>;
}
```

- [ ] **Step 2: Create `src/ports/transaction-repo.ts`**

```ts
import type { Transaction } from '../domain/types.js';

export interface TransactionRepo {
  upsert(transactions: Transaction[]): Promise<number>;
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/ports/bank-provider.ts src/ports/transaction-repo.ts
git commit -m "feat: add BankProvider and TransactionRepo port interfaces"
```

---

### Task 3: Create sync-transactions use case with tests

**Files:**
- Create: `src/usecases/sync-transactions.ts`
- Create: `__tests__/usecases/sync-transactions.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/usecases/sync-transactions.test.ts`:

```ts
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { syncTransactions } from '../../src/usecases/sync-transactions.js';
import type { BankProvider } from '../../src/ports/bank-provider.js';
import type { TransactionRepo } from '../../src/ports/transaction-repo.js';
import type { Transaction } from '../../src/domain/types.js';

const tx: Transaction = {
  id: 'tx-1',
  accountId: 'EE123',
  amount: -15.5,
  currency: 'EUR',
  description: 'Coffee',
  bookingDate: '2026-04-01',
  source: 'lhv',
  sourceId: 'tx-1',
};

describe('syncTransactions', () => {
  it('fetches transactions and upserts them', async () => {
    const provider: BankProvider = {
      fetchTransactions: mock.fn(async () => [tx]),
    };
    const repo: TransactionRepo = {
      upsert: mock.fn(async () => 1),
    };

    const result = await syncTransactions(provider, repo);

    assert.equal(result.synced, 1);
    assert.equal((repo.upsert as any).mock.calls.length, 1);
    assert.deepEqual((repo.upsert as any).mock.calls[0].arguments[0], [tx]);
  });

  it('returns zero when provider returns no transactions', async () => {
    const provider: BankProvider = {
      fetchTransactions: mock.fn(async () => []),
    };
    const repo: TransactionRepo = {
      upsert: mock.fn(async () => 0),
    };

    const result = await syncTransactions(provider, repo);

    assert.equal(result.synced, 0);
    assert.equal((repo.upsert as any).mock.calls.length, 1);
  });

  it('propagates provider errors', async () => {
    const provider: BankProvider = {
      fetchTransactions: mock.fn(async () => {
        throw new Error('API down');
      }),
    };
    const repo: TransactionRepo = {
      upsert: mock.fn(async () => 0),
    };

    await assert.rejects(() => syncTransactions(provider, repo), {
      message: 'API down',
    });
  });

  it('propagates repo errors', async () => {
    const provider: BankProvider = {
      fetchTransactions: mock.fn(async () => [tx]),
    };
    const repo: TransactionRepo = {
      upsert: mock.fn(async () => {
        throw new Error('DB down');
      }),
    };

    await assert.rejects(() => syncTransactions(provider, repo), {
      message: 'DB down',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test __tests__/usecases/sync-transactions.test.ts`
Expected: FAIL — cannot find module `sync-transactions`

- [ ] **Step 3: Write minimal implementation**

Create `src/usecases/sync-transactions.ts`:

```ts
import type { BankProvider } from '../ports/bank-provider.js';
import type { TransactionRepo } from '../ports/transaction-repo.js';

export async function syncTransactions(
  provider: BankProvider,
  repo: TransactionRepo,
): Promise<{ synced: number }> {
  const transactions = await provider.fetchTransactions();
  const synced = await repo.upsert(transactions);
  return { synced };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test __tests__/usecases/sync-transactions.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/usecases/sync-transactions.ts __tests__/usecases/sync-transactions.test.ts
git commit -m "feat: add syncTransactions use case with tests"
```

---

### Task 4: Create Neon transaction repo adapter with tests

**Files:**
- Create: `src/adapters/db/neon-transaction-repo.ts`
- Create: `__tests__/adapters/db/neon-transaction-repo.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/adapters/db/neon-transaction-repo.test.ts`:

```ts
import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Transaction } from '../../../src/domain/types.js';

const mockSqlFn = mock.fn(async () => [{ id: 1 }]);

describe('NeonTransactionRepo', () => {
  beforeEach(() => {
    mockSqlFn.mock.resetCalls();
  });

  it('upserts transactions and returns count of inserted rows', async () => {
    const { NeonTransactionRepo } = await import(
      '../../../src/adapters/db/neon-transaction-repo.js'
    );
    const repo = new NeonTransactionRepo(mockSqlFn as any);

    const txs: Transaction[] = [
      {
        id: 'tx-1',
        accountId: 'EE123',
        amount: -15.5,
        currency: 'EUR',
        description: 'Coffee',
        bookingDate: '2026-04-01',
        source: 'lhv',
        sourceId: 'lhv-tx-1',
      },
      {
        id: 'tx-2',
        accountId: 'EE123',
        amount: -8.0,
        currency: 'EUR',
        description: 'Bus',
        bookingDate: '2026-04-02',
        source: 'lhv',
        sourceId: 'lhv-tx-2',
      },
    ];

    const count = await repo.upsert(txs);

    assert.equal(count, 2);
    assert.equal(mockSqlFn.mock.calls.length, 2);
  });

  it('returns 0 when no transactions provided', async () => {
    const { NeonTransactionRepo } = await import(
      '../../../src/adapters/db/neon-transaction-repo.js'
    );
    const repo = new NeonTransactionRepo(mockSqlFn as any);

    const count = await repo.upsert([]);

    assert.equal(count, 0);
    assert.equal(mockSqlFn.mock.calls.length, 0);
  });

  it('counts only rows with RETURNING results', async () => {
    const sqlReturnsEmpty = mock.fn(async () => []);
    const { NeonTransactionRepo } = await import(
      '../../../src/adapters/db/neon-transaction-repo.js'
    );
    const repo = new NeonTransactionRepo(sqlReturnsEmpty as any);

    const txs: Transaction[] = [
      {
        id: 'tx-1',
        accountId: 'EE123',
        amount: -15.5,
        currency: 'EUR',
        description: 'Coffee',
        bookingDate: '2026-04-01',
        source: 'lhv',
        sourceId: 'lhv-tx-1',
      },
    ];

    const count = await repo.upsert(txs);

    assert.equal(count, 0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test __tests__/adapters/db/neon-transaction-repo.test.ts`
Expected: FAIL — cannot find module `neon-transaction-repo`

- [ ] **Step 3: Write minimal implementation**

Create `src/adapters/db/neon-transaction-repo.ts`:

```ts
import type { Transaction } from '../../domain/types.js';
import type { TransactionRepo } from '../../ports/transaction-repo.js';

type SqlTaggedTemplate = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<Record<string, unknown>[]>;

export class NeonTransactionRepo implements TransactionRepo {
  constructor(private sql: SqlTaggedTemplate) {}

  async upsert(transactions: Transaction[]): Promise<number> {
    let count = 0;
    for (const t of transactions) {
      const rows = await this.sql`
        INSERT INTO transactions (account_id, amount, currency, description, source, source_id, created_at)
        VALUES (${t.accountId}, ${t.amount}, ${t.currency}, ${t.description}, ${t.source}, ${t.sourceId}, ${t.bookingDate})
        ON CONFLICT (account_id, source, source_id) DO NOTHING
        RETURNING id
      `;
      count += rows.length;
    }
    return count;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test __tests__/adapters/db/neon-transaction-repo.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/adapters/db/neon-transaction-repo.ts __tests__/adapters/db/neon-transaction-repo.test.ts
git commit -m "feat: add NeonTransactionRepo adapter with tests"
```

---

### Task 5: Create LHV provider adapter with tests

**Files:**
- Create: `src/adapters/banks/lhv/lhv-provider.ts`
- Create: `__tests__/adapters/banks/lhv-provider.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/adapters/banks/lhv-provider.test.ts`:

```ts
import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const mockFetch = mock.fn();
(global as any).fetch = mockFetch;

describe('LhvProvider', () => {
  beforeEach(() => {
    mockFetch.mock.resetCalls();
    process.env.LHV_CLIENT_ID = 'test-client-id';
    process.env.LHV_API_KEY = 'test-api-key';
  });

  it('fetches and maps transactions to domain type', async () => {
    const lhvResponse = [
      {
        id: 'tx-1',
        bookingDate: '2026-04-01',
        amount: -15.5,
        currency: 'EUR',
        description: 'Coffee',
        accountId: 'EE123456789',
      },
    ];

    mockFetch.mock.mockImplementationOnce(async () => ({
      ok: true,
      json: async () => ({ transactions: lhvResponse }),
    }));

    const { LhvProvider } = await import(
      '../../../src/adapters/banks/lhv/lhv-provider.js'
    );
    const provider = new LhvProvider();
    const result = await provider.fetchTransactions();

    assert.equal(result.length, 1);
    assert.equal(result[0].source, 'lhv');
    assert.equal(result[0].sourceId, 'tx-1');
    assert.equal(result[0].id, 'tx-1');
    assert.equal(result[0].amount, -15.5);
    assert.equal(result[0].bookingDate, '2026-04-01');

    const calledUrl: string = mockFetch.mock.calls[0].arguments[0];
    assert.match(
      calledUrl,
      /dateFrom=\d{4}-\d{2}-\d{2}&dateTo=\d{4}-\d{2}-\d{2}/,
    );
  });

  it('throws when API returns non-2xx', async () => {
    mockFetch.mock.mockImplementationOnce(async () => ({
      ok: false,
      status: 401,
    }));

    const { LhvProvider } = await import(
      '../../../src/adapters/banks/lhv/lhv-provider.js'
    );
    const provider = new LhvProvider();

    await assert.rejects(() => provider.fetchTransactions(), {
      message: 'LHV API error: 401',
    });
  });

  it('throws when env vars are missing', async () => {
    delete process.env.LHV_CLIENT_ID;
    delete process.env.LHV_API_KEY;

    const { LhvProvider } = await import(
      '../../../src/adapters/banks/lhv/lhv-provider.js'
    );
    const provider = new LhvProvider();

    await assert.rejects(() => provider.fetchTransactions(), {
      message: 'LHV_CLIENT_ID and LHV_API_KEY environment variables are required',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test __tests__/adapters/banks/lhv-provider.test.ts`
Expected: FAIL — cannot find module `lhv-provider`

- [ ] **Step 3: Write minimal implementation**

Create `src/adapters/banks/lhv/lhv-provider.ts`:

```ts
import type { Transaction } from '../../../domain/types.js';
import type { BankProvider } from '../../../ports/bank-provider.js';

const LHV_BASE_URL = 'https://connect.lhv.eu';

interface LhvApiTransaction {
  id: string;
  bookingDate: string;
  amount: number;
  currency: string;
  description: string;
  accountId: string;
}

function getDateRange(): { dateFrom: string; dateTo: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 7);

  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { dateFrom: fmt(from), dateTo: fmt(to) };
}

export class LhvProvider implements BankProvider {
  async fetchTransactions(): Promise<Transaction[]> {
    const clientId = process.env.LHV_CLIENT_ID;
    const apiKey = process.env.LHV_API_KEY;

    if (!clientId || !apiKey) {
      throw new Error(
        'LHV_CLIENT_ID and LHV_API_KEY environment variables are required',
      );
    }

    const { dateFrom, dateTo } = getDateRange();
    const url = `${LHV_BASE_URL}/account-statement?dateFrom=${dateFrom}&dateTo=${dateTo}`;

    const response = await fetch(url, {
      headers: {
        'X-Client-Id': clientId,
        'X-Api-Key': apiKey,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`LHV API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      transactions: LhvApiTransaction[];
    };

    return (data.transactions ?? []).map(
      (t): Transaction => ({
        id: t.id,
        accountId: t.accountId,
        amount: t.amount,
        currency: t.currency,
        description: t.description,
        bookingDate: t.bookingDate,
        source: 'lhv',
        sourceId: t.id,
      }),
    );
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test __tests__/adapters/banks/lhv-provider.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/adapters/banks/lhv/lhv-provider.ts __tests__/adapters/banks/lhv-provider.test.ts
git commit -m "feat: add LhvProvider adapter with tests"
```

---

### Task 6: Create Enable Banking provider adapter

**Files:**
- Create: `src/adapters/banks/enablebanking/enablebanking-provider.ts`

- [ ] **Step 1: Create the adapter**

Create `src/adapters/banks/enablebanking/enablebanking-provider.ts`:

```ts
import fs from 'fs';
import jwt from 'jsonwebtoken';
import type { Transaction } from '../../../domain/types.js';
import type { BankProvider } from '../../../ports/bank-provider.js';

const API_BASE = 'https://api.enablebanking.com';

function makeJwt(): string {
  const appId = process.env.ENABLEBANKING_APP_ID;
  const keyPath = process.env.ENABLEBANKING_PRIVATE_KEY_PATH;

  if (!appId || !keyPath) {
    throw new Error(
      'ENABLEBANKING_APP_ID and ENABLEBANKING_PRIVATE_KEY_PATH are required',
    );
  }

  const privateKey = fs.readFileSync(keyPath);
  const now = Math.floor(Date.now() / 1000);

  return jwt.sign(
    {
      iss: 'enablebanking.com',
      aud: 'api.enablebanking.com',
      iat: now,
      exp: now + 3600,
    },
    privateKey,
    { algorithm: 'RS256', header: { typ: 'JWT', alg: 'RS256', kid: appId } },
  );
}

async function apiRequest(
  method: string,
  path: string,
  body?: unknown,
): Promise<unknown> {
  const token = makeJwt();
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Enable Banking API error ${response.status}: ${text}`);
  }

  return response.json();
}

export interface Aspsp {
  name: string;
  country: string;
}

export async function listAspsps(country: string): Promise<Aspsp[]> {
  return (await apiRequest('GET', `/aspsps?country=${country}`)) as Aspsp[];
}

export interface AuthResponse {
  url: string;
}

export async function startAuth(
  aspsp: Aspsp,
  redirectUrl: string,
  validUntil: string,
): Promise<AuthResponse> {
  return (await apiRequest('POST', '/auth', {
    access: { valid_until: validUntil },
    aspsp,
    state: crypto.randomUUID(),
    redirect_url: redirectUrl,
    psu_type: 'personal',
    psu_headers: {
      'psu-ip-address': '127.0.0.1',
    },
  })) as AuthResponse;
}

export interface SessionResponse {
  session_id: string;
  accounts: Array<{ uid: string; iban?: string }>;
}

export async function createSession(
  code: string,
): Promise<SessionResponse> {
  return (await apiRequest('POST', '/sessions', { code })) as SessionResponse;
}

export async function getSession(sessionId: string): Promise<SessionResponse> {
  return (await apiRequest('GET', `/sessions/${sessionId}`)) as SessionResponse;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await apiRequest('DELETE', `/sessions/${sessionId}`);
}

interface EnableBankingTransaction {
  transaction_id: string;
  booking_date: string;
  transaction_amount: { amount: string; currency: string };
  remittance_information_unstructured: string;
}

interface TransactionsResponse {
  transactions: EnableBankingTransaction[];
  continuation_key?: string;
}

async function fetchAllTransactions(
  accountUid: string,
  dateFrom: string,
): Promise<EnableBankingTransaction[]> {
  const all: EnableBankingTransaction[] = [];
  let continuationKey: string | undefined;

  do {
    const params = new URLSearchParams({ date_from: dateFrom });
    if (continuationKey) params.set('continuation_key', continuationKey);

    const res = (await apiRequest(
      'GET',
      `/accounts/${accountUid}/transactions?${params}`,
    )) as TransactionsResponse;

    all.push(...res.transactions);
    continuationKey = res.continuation_key;
  } while (continuationKey);

  return all;
}

export class EnableBankingProvider implements BankProvider {
  constructor(
    private accountUid: string,
    private dateFrom: string,
  ) {}

  async fetchTransactions(): Promise<Transaction[]> {
    const raw = await fetchAllTransactions(this.accountUid, this.dateFrom);

    return raw.map(
      (t): Transaction => ({
        id: t.transaction_id,
        accountId: this.accountUid,
        amount: parseFloat(t.transaction_amount.amount),
        currency: t.transaction_amount.currency,
        description: t.remittance_information_unstructured,
        bookingDate: t.booking_date,
        source: 'enablebanking',
        sourceId: t.transaction_id,
      }),
    );
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/adapters/banks/enablebanking/enablebanking-provider.ts
git commit -m "feat: add EnableBankingProvider adapter"
```

---

### Task 7: Create infrastructure routes and app wiring

**Files:**
- Create: `src/infrastructure/routes/sync-lhv.ts`
- Create: `src/infrastructure/routes/sync-enablebanking.ts`
- Create: `src/infrastructure/app.ts`
- Create: `src/infrastructure/server.ts`
- Create: `src/infrastructure/lambda.ts`

- [ ] **Step 1: Create `src/infrastructure/routes/sync-lhv.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import { LhvProvider } from '../../adapters/banks/lhv/lhv-provider.js';
import { NeonTransactionRepo } from '../../adapters/db/neon-transaction-repo.js';
import { syncTransactions } from '../../usecases/sync-transactions.js';
import { neon } from '@neondatabase/serverless';

interface SyncLhvOptions {
  provider?: LhvProvider;
  repo?: NeonTransactionRepo;
}

export async function syncLhvRoute(
  app: FastifyInstance,
  opts: SyncLhvOptions = {},
) {
  app.get('/sync-lhv', async (_request, reply) => {
    const provider = opts.provider ?? new LhvProvider();
    const repo =
      opts.repo ??
      new NeonTransactionRepo(neon(process.env.DATABASE_URL!));

    try {
      const result = await syncTransactions(provider, repo);
      return reply.send(result);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.startsWith('LHV API error')
      ) {
        return reply.status(503).send({ error: 'LHV API unavailable' });
      }
      return reply.status(500).send({ error: 'Database error' });
    }
  });
}
```

- [ ] **Step 2: Create `src/infrastructure/routes/sync-enablebanking.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import { EnableBankingProvider } from '../../adapters/banks/enablebanking/enablebanking-provider.js';
import { NeonTransactionRepo } from '../../adapters/db/neon-transaction-repo.js';
import { syncTransactions } from '../../usecases/sync-transactions.js';
import { neon } from '@neondatabase/serverless';

interface SyncEnableBankingOptions {
  provider?: EnableBankingProvider;
  repo?: NeonTransactionRepo;
}

export async function syncEnableBankingRoute(
  app: FastifyInstance,
  opts: SyncEnableBankingOptions = {},
) {
  app.get('/sync-enablebanking', async (request, reply) => {
    const query = request.query as {
      accountUid?: string;
      dateFrom?: string;
    };

    if (!query.accountUid || !query.dateFrom) {
      return reply
        .status(400)
        .send({ error: 'accountUid and dateFrom query params required' });
    }

    const provider =
      opts.provider ??
      new EnableBankingProvider(query.accountUid, query.dateFrom);
    const repo =
      opts.repo ??
      new NeonTransactionRepo(neon(process.env.DATABASE_URL!));

    try {
      const result = await syncTransactions(provider, repo);
      return reply.send(result);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.startsWith('Enable Banking API error')
      ) {
        return reply
          .status(503)
          .send({ error: 'Enable Banking API unavailable' });
      }
      return reply.status(500).send({ error: 'Database error' });
    }
  });
}
```

- [ ] **Step 3: Create `src/infrastructure/app.ts`**

```ts
import Fastify from 'fastify';
import { syncLhvRoute } from './routes/sync-lhv.js';
import { syncEnableBankingRoute } from './routes/sync-enablebanking.js';

export function buildApp() {
  const app = Fastify({ logger: true });

  app.get('/health', async () => {
    return { status: 'ok' };
  });

  app.register(syncLhvRoute);
  app.register(syncEnableBankingRoute);

  return app;
}
```

- [ ] **Step 4: Create `src/infrastructure/server.ts`**

```ts
import { buildApp } from './app.js';

const app = buildApp();

app.listen({ port: 3000 }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
```

- [ ] **Step 5: Create `src/infrastructure/lambda.ts`**

```ts
import awsLambdaFastify from '@fastify/aws-lambda';
import { buildApp } from './app.js';

const app = buildApp();
export const handler = awsLambdaFastify(app);
```

- [ ] **Step 6: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/infrastructure/
git commit -m "feat: add infrastructure layer with routes and app wiring"
```

---

### Task 8: Migrate route tests to new structure

**Files:**
- Create: `__tests__/routes/sync-lhv.test.ts`

- [ ] **Step 1: Create `__tests__/routes/sync-lhv.test.ts`**

```ts
import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import type { BankProvider } from '../../src/ports/bank-provider.js';
import type { TransactionRepo } from '../../src/ports/transaction-repo.js';
import type { Transaction } from '../../src/domain/types.js';

const tx: Transaction = {
  id: 'tx-1',
  accountId: 'EE123',
  amount: -15.5,
  currency: 'EUR',
  description: 'Coffee',
  bookingDate: '2026-04-01',
  source: 'lhv',
  sourceId: 'tx-1',
};

const tx2: Transaction = {
  id: 'tx-2',
  accountId: 'EE123',
  amount: -8.0,
  currency: 'EUR',
  description: 'Bus',
  bookingDate: '2026-04-02',
  source: 'lhv',
  sourceId: 'tx-2',
};

describe('GET /sync-lhv', () => {
  it('returns synced count on success', async () => {
    const mockProvider: BankProvider = {
      fetchTransactions: mock.fn(async () => [tx, tx2]),
    };
    const mockRepo: TransactionRepo = {
      upsert: mock.fn(async () => 2),
    };

    const app = Fastify();
    const { syncLhvRoute } = await import(
      '../../src/infrastructure/routes/sync-lhv.js'
    );
    app.register(syncLhvRoute, {
      provider: mockProvider,
      repo: mockRepo,
    });

    const response = await app.inject({ method: 'GET', url: '/sync-lhv' });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), { synced: 2 });
  });

  it('returns 503 when bank API fails', async () => {
    const mockProvider: BankProvider = {
      fetchTransactions: mock.fn(async () => {
        throw new Error('LHV API error: 401');
      }),
    };
    const mockRepo: TransactionRepo = {
      upsert: mock.fn(async () => 0),
    };

    const app = Fastify();
    const { syncLhvRoute } = await import(
      '../../src/infrastructure/routes/sync-lhv.js'
    );
    app.register(syncLhvRoute, {
      provider: mockProvider,
      repo: mockRepo,
    });

    const response = await app.inject({ method: 'GET', url: '/sync-lhv' });
    assert.equal(response.statusCode, 503);
    assert.deepEqual(JSON.parse(response.body), {
      error: 'LHV API unavailable',
    });
  });

  it('returns 500 when DB fails', async () => {
    const mockProvider: BankProvider = {
      fetchTransactions: mock.fn(async () => [tx]),
    };
    const mockRepo: TransactionRepo = {
      upsert: mock.fn(async () => {
        throw new Error('connection refused');
      }),
    };

    const app = Fastify();
    const { syncLhvRoute } = await import(
      '../../src/infrastructure/routes/sync-lhv.js'
    );
    app.register(syncLhvRoute, {
      provider: mockProvider,
      repo: mockRepo,
    });

    const response = await app.inject({ method: 'GET', url: '/sync-lhv' });
    assert.equal(response.statusCode, 500);
    assert.deepEqual(JSON.parse(response.body), {
      error: 'Database error',
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx tsx --test __tests__/routes/sync-lhv.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 3: Commit**

```bash
git add __tests__/routes/sync-lhv.test.ts
git commit -m "feat: add route tests for new infrastructure layer"
```

---

### Task 9: Update build script and config

**Files:**
- Modify: `scripts/build.sh`
- Modify: `package.json`
- Modify: `tsconfig.json`

- [ ] **Step 1: Update `scripts/build.sh` to use new entry point**

Change the esbuild entry from `src/lambda.ts` to `src/infrastructure/lambda.ts`:

```bash
#!/bin/bash
set -e

echo "==> Building Lambda bundle..."

npx esbuild src/infrastructure/lambda.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --format=cjs \
  --outfile=dist/lambda.js

echo "==> Zipping..."

mkdir -p dist
cd dist && zip -j lambda.zip lambda.js && cd ..

echo "==> Build complete: dist/lambda.zip"
```

- [ ] **Step 2: Update `package.json` dev script**

Change the dev script from `npx tsx watch src/server.ts` to `npx tsx watch src/infrastructure/server.ts`:

```json
"dev": "npx tsx watch src/infrastructure/server.ts"
```

- [ ] **Step 3: Update `tsconfig.json` to include tests outside src**

The `rootDir` needs to change since tests now live outside `src/`. Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src", "__tests__"],
  "exclude": ["node_modules", "dist", ".esbuild"]
}
```

- [ ] **Step 4: Verify build works**

Run: `npm run build`
Expected: Build succeeds, `dist/lambda.js` and `dist/lambda.zip` created

- [ ] **Step 5: Verify all tests pass**

Run: `npx tsx --test __tests__/**/*.test.ts`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add scripts/build.sh package.json tsconfig.json
git commit -m "chore: update build and config for new directory structure"
```

---

### Task 10: Remove old files

**Files:**
- Delete: `src/lhv-client.ts`
- Delete: `src/enablebanking-client.ts`
- Delete: `src/db.ts`
- Delete: `src/routes/sync-lhv.ts`
- Delete: `src/routes/` (directory)
- Delete: `src/app.ts`
- Delete: `src/server.ts`
- Delete: `src/lambda.ts`
- Delete: `src/__tests__/lhv-client.test.ts`
- Delete: `src/__tests__/sync-lhv.test.ts`
- Delete: `src/__tests__/` (directory)

- [ ] **Step 1: Remove old source files**

```bash
rm src/lhv-client.ts
rm src/enablebanking-client.ts
rm src/db.ts
rm src/routes/sync-lhv.ts
rmdir src/routes
rm src/app.ts
rm src/server.ts
rm src/lambda.ts
```

- [ ] **Step 2: Remove old test files**

```bash
rm src/__tests__/lhv-client.test.ts
rm src/__tests__/sync-lhv.test.ts
rmdir src/__tests__
```

- [ ] **Step 3: Verify build still works**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Verify all tests still pass**

Run: `npx tsx --test __tests__/**/*.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Verify final directory structure**

Run: `find src -type f | sort`
Expected:
```
src/adapters/banks/enablebanking/enablebanking-provider.ts
src/adapters/banks/lhv/lhv-provider.ts
src/adapters/db/neon-transaction-repo.ts
src/domain/types.ts
src/infrastructure/app.ts
src/infrastructure/lambda.ts
src/infrastructure/routes/sync-enablebanking.ts
src/infrastructure/routes/sync-lhv.ts
src/infrastructure/server.ts
src/ports/bank-provider.ts
src/ports/transaction-repo.ts
src/usecases/sync-transactions.ts
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove old flat structure files after migration"
```
