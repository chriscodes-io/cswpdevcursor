import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Hono } from "hono";
import { AgiledApiError } from "./types.js";
import { toSafePathSegment } from "./pathSegment.js";

describe("toSafePathSegment", () => {
  it("accepts alphanumeric CRM ids", () => {
    assert.equal(toSafePathSegment("12345"), "12345");
    assert.equal(toSafePathSegment("contact_abc-1"), "contact_abc-1");
  });

  it("rejects path traversal and separators that escape allowlisted Agiled routes", () => {
    for (const value of [
      "../webhook-subscriptions",
      "..%2Fwebhook-subscriptions",
      "%2e%2e%2fwebhook-subscriptions",
      "foo/bar",
      "foo\\bar",
      "..",
      ".",
      "",
    ]) {
      assert.throws(() => toSafePathSegment(value, "contactId"), (error: unknown) => {
        assert.ok(error instanceof AgiledApiError);
        assert.equal(error.status, 400);
        return true;
      });
    }
  });

  it("keeps encoded traversal from normalizing to sibling Agiled endpoints", () => {
    assert.throws(() => toSafePathSegment("../webhook-subscriptions"));
    // Defense in depth: even if a caller skipped validation, encoding alone must not
    // resolve to /webhook-subscriptions under URL normalization.
    const encoded = encodeURIComponent("../webhook-subscriptions");
    assert.equal(
      new URL(`https://api.agiled.ai/public/v1/contacts/${encoded}`).pathname,
      "/public/v1/contacts/..%2Fwebhook-subscriptions",
    );
  });
});

describe("CRM proxy route params", () => {
  it("Hono decodes %2F so traversal reaches the handler without a segment guard", async () => {
    const crm = new Hono();
    let seen: string | undefined;
    crm.get("/contacts/:contactId", (c) => {
      seen = c.req.param("contactId");
      return c.json({ contactId: seen });
    });
    const app = new Hono();
    app.route("/api/crm", crm);

    const res = await app.request("/api/crm/contacts/..%2Fwebhook-subscriptions");
    assert.equal(res.status, 200);
    assert.equal(seen, "../webhook-subscriptions");
    assert.equal(
      new URL(`https://api.agiled.ai/public/v1/contacts/${seen}`).pathname,
      "/public/v1/webhook-subscriptions",
    );
  });

  it("rejects traversal when the handler validates path segments", async () => {
    const crm = new Hono();
    crm.get("/contacts/:contactId", (c) => {
      try {
        const contactId = toSafePathSegment(c.req.param("contactId"), "contactId");
        return c.json({ contactId });
      } catch (error) {
        if (error instanceof AgiledApiError) {
          return c.json({ error: error.message }, error.status as 400);
        }
        throw error;
      }
    });
    const app = new Hono();
    app.route("/api/crm", crm);

    const res = await app.request("/api/crm/contacts/..%2Fwebhook-subscriptions");
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { error: "Invalid contactId" });
  });
});
