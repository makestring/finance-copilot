const BASE_URL = "http://localhost:3000";
const CLIENT_ID = "11111111-1111-1111-1111-111111111111";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-client-id": CLIENT_ID,
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export type Subscription = {
  id: string;
  name: string;
  amountCents: number;
  billingDay: number;
  isActive: boolean;
};

export type DashboardOverview = {
  score: { value: number; label: string };
  ui: {
    hero: { title: string; headline: string; subtitle: string };
    highlightCard: { title: string; value: string; subtitle: string };
  };
  topAction?: {
    label: string;
    ctaLabel: string;
    impactLabel?: string;
    monthlySavingsFormatted?: string;
    performance?: { successRate: number; actualSavingsFormatted: string };
    action?: { kind: "navigate" | "api"; screen?: string; path?: string; method?: string };
  };
  alertsSummary?: { unread: number };
};

export type SubscriptionsResponse = {
  ok: boolean;
  subscriptions: Subscription[];
  summary: {
    count: number;
    monthlyTotalCents: number;
    yearlyTotalCents: number;
    top3: { name: string; amountCents: number }[];
  };
};

export type CancelResponse = {
  ok: boolean;
  toast: string;
  delta: { scoreBefore: number; scoreAfter: number; diff: number };
  savings: { monthlyCents: number; yearlyCents: number };
};

export type ScoreResponse = {
  ok: boolean;
  score: { value: number; level: string };
};

export const api = {
  getDashboard: () => apiFetch<DashboardOverview>("/dashboard/overview"),

  getSubscriptions: () => apiFetch<SubscriptionsResponse>("/subscriptions"),

  cancelSubscription: (subscriptionId: string) =>
    apiFetch<CancelResponse>(`/subscriptions/${subscriptionId}/confirm-cancel`, {
      method: "POST",
    }),

  getScore: () => apiFetch<ScoreResponse>("/score/monthly"),

  postOnboardingProfile: (data: {
    monthlyIncomeCents: number;
    fixedExpenses: { name: string; amountCents: number }[];
  }) =>
    apiFetch<{ ok: boolean }>("/onboarding/profile", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  createSubscription: (data: { name: string; amountCents: number; billingDay: number }) =>
    apiFetch<{ ok: boolean }>("/subscriptions", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
