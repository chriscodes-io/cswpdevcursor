import { Hono } from "hono";
import { AgiledApiError } from "../lib/agiled/types.js";
import { agiled } from "../lib/agiled/client.js";

const crm = new Hono();

crm.get("/me", async (c) => {
  const result = await agiled.me();
  return c.json(result);
});

crm.get("/contacts", async (c) => {
  const result = await agiled.listContacts(Object.fromEntries(new URL(c.req.url).searchParams));
  return c.json(result);
});

crm.get("/contacts/:contactId", async (c) => {
  const result = await agiled.getContact(c.req.param("contactId"), Object.fromEntries(new URL(c.req.url).searchParams));
  return c.json(result);
});

crm.post("/contacts", async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const idempotencyKey = c.req.header("Idempotency-Key") ?? undefined;
  const result = await agiled.createContact(body, idempotencyKey);
  return c.json(result, 201);
});

crm.patch("/contacts/:contactId", async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const result = await agiled.updateContact(c.req.param("contactId"), body);
  return c.json(result);
});

crm.get("/accounts", async (c) => {
  const result = await agiled.listAccounts(Object.fromEntries(new URL(c.req.url).searchParams));
  return c.json(result);
});

crm.get("/accounts/:accountId", async (c) => {
  const result = await agiled.getAccount(c.req.param("accountId"), Object.fromEntries(new URL(c.req.url).searchParams));
  return c.json(result);
});

crm.post("/accounts", async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const idempotencyKey = c.req.header("Idempotency-Key") ?? undefined;
  const result = await agiled.createAccount(body, idempotencyKey);
  return c.json(result, 201);
});

crm.patch("/accounts/:accountId", async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const result = await agiled.updateAccount(c.req.param("accountId"), body);
  return c.json(result);
});

crm.get("/deals", async (c) => {
  const result = await agiled.listDeals(Object.fromEntries(new URL(c.req.url).searchParams));
  return c.json(result);
});

crm.get("/deals/:dealId", async (c) => {
  const result = await agiled.getDeal(c.req.param("dealId"), Object.fromEntries(new URL(c.req.url).searchParams));
  return c.json(result);
});

crm.post("/deals", async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const idempotencyKey = c.req.header("Idempotency-Key") ?? undefined;
  const result = await agiled.createDeal(body, idempotencyKey);
  return c.json(result, 201);
});

crm.patch("/deals/:dealId", async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const result = await agiled.updateDeal(c.req.param("dealId"), body);
  return c.json(result);
});

crm.get("/tickets", async (c) => {
  const result = await agiled.listTickets(Object.fromEntries(new URL(c.req.url).searchParams));
  return c.json(result);
});

crm.post("/tickets", async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const idempotencyKey = c.req.header("Idempotency-Key") ?? undefined;
  const result = await agiled.createTicket(body, idempotencyKey);
  return c.json(result, 201);
});

crm.get("/projects", async (c) => {
  const result = await agiled.listProjects(Object.fromEntries(new URL(c.req.url).searchParams));
  return c.json(result);
});

crm.get("/invoices", async (c) => {
  const result = await agiled.listInvoices(Object.fromEntries(new URL(c.req.url).searchParams));
  return c.json(result);
});

crm.onError((error, c) => {
  if (error instanceof AgiledApiError) {
    return c.json({ error: error.message, details: error.body }, error.status as 400);
  }

  console.error("[crm]", error);
  return c.json({ error: "Internal server error" }, 500);
});

export { crm };
