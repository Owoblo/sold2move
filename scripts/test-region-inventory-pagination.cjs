const test = require('node:test');
const assert = require('node:assert/strict');
const { fetchExistingRegionListings } = require('./postcard-step0-scrape.cjs');

function client({ failAt = null } = {}) {
  const calls = [];
  const all = Array.from({ length: 1703 }, (_, i) => ({
    zpid: String(i), region: 'ottawa', status: i < 502 ? 'sold_archived' : 'active',
    city: i % 2 ? null : 'An unconfigured city',
  }));
  return { calls, from() {
    let statuses;
    const query = {
      select() { return query; },
      eq(column, value) { assert.equal(column, 'region'); assert.equal(value, 'ottawa'); return query; },
      in(column, value) { assert.equal(column, 'status'); statuses = value; return query; },
      order(column) { assert.equal(column, 'zpid'); return query; },
      async range(from, to) {
        calls.push({ from, to, statuses });
        assert.equal(to - from + 1, 500);
        if (from === failAt) return { error: { message: 'statement timeout' } };
        return { data: all.filter(r => statuses.includes(r.status)).slice(from, to + 1) };
      },
    };
    return query;
  } };
}
test('retrieves more than the API cap, including null and unknown cities', async () => {
  const db = client();
  const rows = await fetchExistingRegionListings(db, { key: 'ottawa', cities: ['Ottawa'] });
  assert.equal(rows.length, 1703);
  assert.equal(new Set(rows.map(r => r.zpid)).size, 1703);
  assert.equal(db.calls.length, 5);
});
test('a later-page error rejects the partial inventory', async () => {
  await assert.rejects(fetchExistingRegionListings(client({ failAt: 500 }), { key: 'ottawa' }), /offset 500/);
});
