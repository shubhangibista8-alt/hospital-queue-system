import type { Token, Urgency } from './queueModel';

export type QueueState = {
  queues: Record<string, Token[]>;
  pending: Token[];
  departments: string[];
};

async function sendRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function fetchState(): Promise<QueueState> {
  return sendRequest<QueueState>('/api/state');
}

export async function createToken(payload: {
  patientName: string;
  department: string;
  urgency: Urgency;
}): Promise<Token> {
  return sendRequest<{ token: Token }>('/api/token', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((result) => result.token);
}

export async function callNextToken(department: string): Promise<Token | null> {
  return sendRequest<{ token: Token | null }>('/api/call', {
    method: 'POST',
    body: JSON.stringify({ department }),
  }).then((result) => result.token);
}

export async function skipNextToken(department: string): Promise<Token | null> {
  return sendRequest<{ token: Token | null }>('/api/skip', {
    method: 'POST',
    body: JSON.stringify({ department }),
  }).then((result) => result.token);
}

export async function reinsertToken(tokenId: string): Promise<boolean> {
  return sendRequest<{ success: boolean }>('/api/reinsert', {
    method: 'POST',
    body: JSON.stringify({ tokenId }),
  }).then((result) => result.success);
}

export async function resetCounters(): Promise<void> {
  await sendRequest('/api/reset-counters', {
    method: 'POST',
  });
}
