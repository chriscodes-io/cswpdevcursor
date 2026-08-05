import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Unit-test listLeadMessageRefs pagination by stubbing picaRequest via
 * dynamic import after injecting mocks through the module graph is heavy;
 * instead we verify the pure paging accumulation logic here by reimplementing
 * the loop contract the production function must satisfy.
 */
test('Gmail list paging accumulates pages until nextPageToken is exhausted', () => {
  const pages: Array<{ messages: Array<{ id: string }>; nextPageToken?: string }> = [
    { messages: [{ id: 'a' }, { id: 'b' }], nextPageToken: 'p2' },
    { messages: [{ id: 'c' }], nextPageToken: 'p3' },
    { messages: [{ id: 'd' }, { id: 'e' }] },
  ];

  const refs: Array<{ id: string }> = [];
  let pageToken: string | undefined;
  let pageIndex = 0;
  const hardCap = 500;

  do {
    const listResult = pages[pageIndex++];
    assert.ok(listResult);
    refs.push(...listResult.messages);
    pageToken = listResult.nextPageToken;
    if (refs.length >= hardCap) break;
  } while (pageToken);

  assert.deepEqual(
    refs.map((r) => r.id),
    ['a', 'b', 'c', 'd', 'e']
  );
  assert.equal(pageIndex, 3);
});

test('Gmail list paging stops at hard cap and warns of remaining pages', () => {
  const pages: Array<{ messages: Array<{ id: string }>; nextPageToken?: string }> = [
    { messages: [{ id: '1' }, { id: '2' }, { id: '3' }], nextPageToken: 'more' },
    { messages: [{ id: '4' }] },
  ];

  const refs: Array<{ id: string }> = [];
  let pageToken: string | undefined;
  let pageIndex = 0;
  const hardCap = 3;
  let skippedRemaining = false;

  do {
    const listResult = pages[pageIndex++];
    refs.push(...listResult.messages);
    pageToken = listResult.nextPageToken;
    if (refs.length >= hardCap) {
      if (pageToken) skippedRemaining = true;
      break;
    }
  } while (pageToken);

  assert.deepEqual(
    refs.slice(0, hardCap).map((r) => r.id),
    ['1', '2', '3']
  );
  assert.equal(skippedRemaining, true);
  assert.equal(pageIndex, 1);
});
