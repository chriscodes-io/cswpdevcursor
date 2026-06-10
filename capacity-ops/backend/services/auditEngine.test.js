const test = require('node:test');
const assert = require('node:assert/strict');
const { ReadableStream } = require('node:stream/web');
const { assertPublicAuditUrl, fetchHtml, normalizeUrl } = require('./auditEngine');

function htmlResponse(body, init = {}) {
  return {
    ok: init.status == null || (init.status >= 200 && init.status < 300),
    status: init.status || 200,
    url: init.url,
    headers: {
      get(name) {
        return init.headers?.[name.toLowerCase()] || null;
      },
    },
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(Buffer.from(body));
        controller.close();
      },
    }),
    text: async () => body,
  };
}

test('normalizes bare hostnames to https URLs', () => {
  assert.equal(normalizeUrl('example.com'), 'https://example.com/');
});

test('rejects direct localhost and private IP audit URLs', async () => {
  await assert.rejects(() => assertPublicAuditUrl('http://localhost/admin'), /Private or internal/);
  await assert.rejects(() => assertPublicAuditUrl('http://127.0.0.1/admin'), /Private or internal/);
  await assert.rejects(() => assertPublicAuditUrl('http://[::1]/admin'), /Private or internal/);
  await assert.rejects(() => assertPublicAuditUrl('http://169.254.169.254/latest/meta-data'), /Private or internal/);
  await assert.rejects(() => assertPublicAuditUrl('http://10.0.0.5/'), /Private or internal/);
});

test('rejects redirects to private URLs before fetching the redirect target', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url) => {
    calls.push(url);
    return htmlResponse('', {
      status: 302,
      url,
      headers: { location: 'http://127.0.0.1/admin' },
    });
  };

  try {
    await assert.rejects(() => fetchHtml('https://example.com'), /Private or internal/);
    assert.deepEqual(calls, ['https://example.com/']);
  } finally {
    global.fetch = originalFetch;
  }
});
