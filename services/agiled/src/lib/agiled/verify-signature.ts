import { createHmac, timingSafeEqual } from "node:crypto";

const SIGNATURE_HEADERS = [
  "x-agiled-signature",
  "x-webhook-signature",
  "x-signature",
  "agiled-signature",
] as const;

export function extractSignatureHeader(headers: Headers): string | null {
  for (const name of SIGNATURE_HEADERS) {
    const value = headers.get(name);
    if (value) return value;
  }
  return null;
}

export function verifyAgiledWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!secret) return false;
  if (!signatureHeader) return false;

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const candidates = normalizeSignatureCandidates(signatureHeader);

  return candidates.some((candidate) => safeEqual(candidate, expected));
}

function normalizeSignatureCandidates(header: string): string[] {
  const trimmed = header.trim();
  const values = new Set<string>([trimmed]);

  if (trimmed.includes("=")) {
    const parts = trimmed.split(",").map((part) => part.trim());
    for (const part of parts) {
      const [, value] = part.split("=");
      if (value) values.add(value.trim());
    }
  }

  if (trimmed.startsWith("sha256=")) {
    values.add(trimmed.slice("sha256=".length));
  }

  return [...values].filter(Boolean);
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}
