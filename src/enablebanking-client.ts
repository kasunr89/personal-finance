import fs from 'fs';
import jwt from 'jsonwebtoken';

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

export interface Transaction {
  transaction_id: string;
  booking_date: string;
  transaction_amount: { amount: string; currency: string };
  remittance_information_unstructured: string;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  continuation_key?: string;
}

export async function fetchTransactions(
  accountUid: string,
  dateFrom: string,
): Promise<Transaction[]> {
  const all: Transaction[] = [];
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
