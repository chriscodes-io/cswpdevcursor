export type AgiledPaginationMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type AgiledListResponse<T> = {
  data: T[];
  meta: AgiledPaginationMeta;
};

export type AgiledItemResponse<T> = {
  data: T;
};

export type AgiledResource = {
  id: string;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
};

export type AgiledWebhookEvent =
  | "contact.created"
  | "contact.updated"
  | "contact.deleted"
  | "account.created"
  | "account.updated"
  | "account.deleted"
  | "deal.created"
  | "deal.updated"
  | "deal.deleted"
  | "deal.status_changed"
  | "ticket.created"
  | "ticket.updated"
  | "project.created"
  | "project.updated"
  | "project.deleted"
  | "task.created"
  | "task.updated"
  | "task.deleted"
  | "task.status_changed"
  | "invoice.created"
  | "invoice.updated"
  | "invoice.deleted"
  | "invoice.paid"
  | "payment.created"
  | "payment.updated"
  | "payment.deleted"
  | "time_entry.created"
  | "time_entry.updated"
  | "time_entry.deleted"
  | "pipeline.created"
  | "pipeline.updated"
  | "pipeline.deleted"
  | "stage.created"
  | "stage.updated"
  | "stage.deleted"
  | "form.created"
  | "form.updated"
  | "form.deleted"
  | "form_submission.received"
  | "expense.created"
  | "expense.updated"
  | "expense.deleted"
  | "product.created"
  | "product.updated"
  | "product.deleted"
  | "file.created"
  | "file.updated"
  | "file.restored"
  | "file.deleted"
  | "folder.created"
  | "folder.updated"
  | "folder.restored"
  | "folder.deleted"
  | "document.created"
  | "document.updated"
  | "document.deleted"
  | "appointment.created"
  | "appointment.updated"
  | "appointment.deleted"
  | "order.created"
  | "order.updated"
  | "employee.created"
  | "employee.updated"
  | "employee.deleted"
  | "leave.approved"
  | "leave.requested"
  | "leave.rejected"
  | "leave.updated"
  | "leave.cancelled"
  | "estimate.created"
  | "estimate.updated"
  | "estimate.deleted";

export type AgiledWebhookPayload = {
  event: AgiledWebhookEvent;
  data: AgiledResource;
  [key: string]: unknown;
};

export type AgiledWebhookSubscription = {
  id: string;
  target_url: string;
  description?: string | null;
  events: AgiledWebhookEvent[];
  status: string;
  secret?: string | null;
  last_delivery_at?: string | null;
  created_at?: string | null;
};

export type AgiledMeResponse = {
  data: {
    abilities: string[];
    organization: { id: string; name: string };
    user: { id: string; email: string; name: string };
  };
};

export type ListQuery = Record<string, string | number | undefined>;

export class AgiledApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "AgiledApiError";
  }
}
