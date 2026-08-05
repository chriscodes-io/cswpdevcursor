/**
 * Regression: vanity /audit/share/:token must hit the share handler.
 * Netlify 200-rewrites preserve the original browser path as event.path, so
 * Express must serve /audit/share/:token — not only /api/audit/share/:token.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const Module = require('module');

function loadAppWithStubShare() {
  const hits = [];
  const originalLoad = Module._load;

  delete require.cache[require.resolve('../app')];
  delete require.cache[require.resolve('./audit')];
  delete require.cache[require.resolve('./leads')];

  Module._load = function mockLoad(request, parent, isMain) {
    if (request === './routes/audit' && parent?.filename?.endsWith('/app.js')) {
      const express = require('express');
      const router = express.Router();
      const serveSharedAudit = (req, res) => {
        hits.push(req.params.shareToken);
        res.status(200).type('html').send(`shared:${req.params.shareToken}`);
      };
      router.get('/share/:shareToken', serveSharedAudit);
      router.serveSharedAudit = serveSharedAudit;
      return router;
    }
    if (request === './routes/leads' && parent?.filename?.endsWith('/app.js')) {
      return require('express').Router();
    }
    return originalLoad(request, parent, isMain);
  };

  try {
    const { createApp } = require('../app');
    return { app: createApp(), hits, restore: () => { Module._load = originalLoad; } };
  } catch (err) {
    Module._load = originalLoad;
    throw err;
  }
}

function listen(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        port,
        close: () =>
          new Promise((r, j) => server.close((err) => (err ? j(err) : r()))),
      });
    });
  });
}

function get(port, path) {
  return new Promise((resolve, reject) => {
    http
      .get({ hostname: '127.0.0.1', port, path }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      })
      .on('error', reject);
  });
}

test('GET /audit/share/:token and /api/audit/share/:token both serve the report', async () => {
  const { app, hits, restore } = loadAppWithStubShare();
  let server;
  try {
    server = await listen(app);

    const vanity = await get(server.port, '/audit/share/tok123');
    assert.equal(vanity.status, 200);
    assert.equal(vanity.body, 'shared:tok123');

    const api = await get(server.port, '/api/audit/share/tok456');
    assert.equal(api.status, 200);
    assert.equal(api.body, 'shared:tok456');

    assert.deepEqual(hits, ['tok123', 'tok456']);
  } finally {
    restore();
    if (server) await server.close();
    delete require.cache[require.resolve('../app')];
  }
});
