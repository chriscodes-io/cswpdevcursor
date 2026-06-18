import { config } from "../../config.js";
import {
  AgiledApiError,
  AgiledItemResponse,
  AgiledListResponse,
  AgiledMeResponse,
  AgiledResource,
  AgiledWebhookEvent,
  AgiledWebhookSubscription,
  ListQuery,
} from "./types.js";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: ListQuery;
  idempotencyKey?: string;
};

function buildQuery(query?: ListQuery): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export class AgiledClient {
  constructor(
    private readonly apiKey = config.agiled.apiKey,
    private readonly baseUrl = config.agiled.baseUrl,
  ) {}

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    if (!this.apiKey) {
      throw new AgiledApiError("AGILED_API_KEY is not configured", 500, null);
    }

    const url = `${this.baseUrl}${path}${buildQuery(options.query)}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
    };

    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    if (options.idempotencyKey) {
      headers["Idempotency-Key"] = options.idempotencyKey;
    }

    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const text = await response.text();
    const body = text ? safeJsonParse(text) : null;

    if (!response.ok) {
      throw new AgiledApiError(
        `Agiled API ${options.method ?? "GET"} ${path} failed with ${response.status}`,
        response.status,
        body,
      );
    }

    return body as T;
  }

  me(): Promise<AgiledMeResponse> {
    return this.request<AgiledMeResponse>("/me");
  }

  listContacts(query?: ListQuery): Promise<AgiledListResponse<AgiledResource>> {
    return this.request("/contacts", { query });
  }

  getContact(contactId: string, query?: ListQuery): Promise<AgiledItemResponse<AgiledResource>> {
    return this.request(`/contacts/${contactId}`, { query });
  }

  createContact(body: Record<string, unknown>, idempotencyKey?: string): Promise<AgiledItemResponse<AgiledResource>> {
    return this.request("/contacts", { method: "POST", body, idempotencyKey });
  }

  updateContact(contactId: string, body: Record<string, unknown>): Promise<AgiledItemResponse<AgiledResource>> {
    return this.request(`/contacts/${contactId}`, { method: "PATCH", body });
  }

  listAccounts(query?: ListQuery): Promise<AgiledListResponse<AgiledResource>> {
    return this.request("/accounts", { query });
  }

  getAccount(accountId: string, query?: ListQuery): Promise<AgiledItemResponse<AgiledResource>> {
    return this.request(`/accounts/${accountId}`, { query });
  }

  createAccount(body: Record<string, unknown>, idempotencyKey?: string): Promise<AgiledItemResponse<AgiledResource>> {
    return this.request("/accounts", { method: "POST", body, idempotencyKey });
  }

  updateAccount(accountId: string, body: Record<string, unknown>): Promise<AgiledItemResponse<AgiledResource>> {
    return this.request(`/accounts/${accountId}`, { method: "PATCH", body });
  }

  listDeals(query?: ListQuery): Promise<AgiledListResponse<AgiledResource>> {
    return this.request("/deals", { query });
  }

  getDeal(dealId: string, query?: ListQuery): Promise<AgiledItemResponse<AgiledResource>> {
    return this.request(`/deals/${dealId}`, { query });
  }

  createDeal(body: Record<string, unknown>, idempotencyKey?: string): Promise<AgiledItemResponse<AgiledResource>> {
    return this.request("/deals", { method: "POST", body, idempotencyKey });
  }

  updateDeal(dealId: string, body: Record<string, unknown>): Promise<AgiledItemResponse<AgiledResource>> {
    return this.request(`/deals/${dealId}`, { method: "PATCH", body });
  }

  listTickets(query?: ListQuery): Promise<AgiledListResponse<AgiledResource>> {
    return this.request("/tickets", { query });
  }

  createTicket(body: Record<string, unknown>, idempotencyKey?: string): Promise<AgiledItemResponse<AgiledResource>> {
    return this.request("/tickets", { method: "POST", body, idempotencyKey });
  }

  listProjects(query?: ListQuery): Promise<AgiledListResponse<AgiledResource>> {
    return this.request("/projects", { query });
  }

  listInvoices(query?: ListQuery): Promise<AgiledListResponse<AgiledResource>> {
    return this.request("/invoices", { query });
  }

  listWebhookSubscriptions(): Promise<AgiledListResponse<AgiledWebhookSubscription>> {
    return this.request("/webhook-subscriptions");
  }

  createWebhookSubscription(input: {
    target_url: string;
    description?: string;
    events: AgiledWebhookEvent[];
  }): Promise<AgiledItemResponse<AgiledWebhookSubscription>> {
    return this.request("/webhook-subscriptions", { method: "POST", body: input });
  }

  deleteWebhookSubscription(subscriptionId: string): Promise<void> {
    return this.request(`/webhook-subscriptions/${subscriptionId}`, { method: "DELETE" });
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const agiled = new AgiledClient();
