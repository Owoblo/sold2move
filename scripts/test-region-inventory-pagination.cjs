const test = require('node:test');
const assert = require('node:assert/strict');
const { fetchExistingRegionListings } = require('./postcard-step0-scrape.cjs');

function client({ timeoutFirstPage = false, failStatus = null, failAt = null } = {}) {
  const calls = [];
  let didTimeout = false;
  const all = Array.from({ length: 1703 }, (_, i) => ({
    zpid: String(i), region: 'ottawa', status: i < 502 ? 'sold_archived' : 'active',
    city: i % 2 ? null : 'An unconfigured city',
  }));
  return { calls, from() {
    let status;
    const query = {
      select() { return query; },
      eq(column, value) {
        if (column === 'region') assert.equal(value, 'ottawa');
        else if (column === 'status') status = value;
        else assert.fail(`unexpected filter ${column}`);
        return query;
      },
      order(column) { assert.equal(column, 'zpid'); return query; },
      async range(from, to) {
        calls.push({ from, to, status });
        const size = to - from + 1;
        assert.ok(size <= 100 && size >= 25);
        if (timeoutFirstPage && !didTimeout) {
          didTimeout = true;
          return { error: { message: 'canceling statement due to statement timeout' } };
        }
        if (status === failStatus && from === failAt) {
          return { error: { message: 'canceling statement due to statement timeout' } };
        }
        return { data: all.filter(row => row.status === status).slice(from, from + size) };
      },
    };
    return query;
  } };
}

test('retrieves per-status pages, including null and unknown cities, and shrinks after timeout', async () => {
  const db = client({ timeoutFirstPage: true });
  const rows = await fetchExistingRegionListings(db, { key: 'ottawa', cities: ['Ottawa'] });
  assert.equal(rows.length, 1703);
  assert.equal(new Set(rows.map(row => row.zpid)).size, 1703);
  assert.ok(db.calls.some(call => call.to - call.from + 1 === 50), 'timeout retries with a smaller page');
  assert.ok(db.calls.some(call => call.status === 'active'));
  assert.ok(db.calls.some(call => call.status === 'sold_archived'));
});

test('a repeated later-page timeout rejects the incomplete inventory', async () => {
  await assert.rejects(
    fetchExistingRegionListings(client({ failStatus: 'active', failAt: 100 }), { key: 'ottawa' }),
    /active.*offset 100/,
  );
});
