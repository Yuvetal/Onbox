import type { User, Sender, Email, PaginatedResponse, SchedulePayload } from '../types';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Custom fetch wrapper that includes credentials (httpOnly JWT cookies) on all requests.
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include', // Includes httpOnly cookies for session auth
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export const authApi = {
  me: () => request<{ user: User }>('/auth/me'),
  loginWithEmail: (email: string) =>
    request<{ message: string; user: User }>('/auth/email-login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),
};

export const slackApi = {
  status: () => request<{ connected: boolean; teamId: string | null }>('/slack/status'),
  disconnect: () => request<{ message: string; connected: boolean }>('/slack/disconnect', { method: 'POST' }),
};

export const sendersApi = {
  list: () => request<{ data: Sender[]; defaultUser?: User }>('/senders'),
  create: (email: string) => request<{ data: Sender }>('/senders', { method: 'POST', body: JSON.stringify({ email }) }),
};

export const scheduleApi = {
  create: (payload: SchedulePayload) =>
    request<{ message: string; count: number; emails: Email[] }>('/schedule', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export const emailsApi = {
  getScheduled: (page = 1, pageSize = 20) =>
    request<PaginatedResponse<Email>>(`/emails/scheduled?page=${page}&pageSize=${pageSize}`),
  getSent: (page = 1, pageSize = 20) =>
    request<PaginatedResponse<Email>>(`/emails/sent?page=${page}&pageSize=${pageSize}`),
  getById: (id: string) => request<{ data: Email }>(`/emails/${id}`),
};

export const searchApi = {
  query: (q: string) => request<{ data: Email[] }>(`/search?q=${encodeURIComponent(q)}`),
};
