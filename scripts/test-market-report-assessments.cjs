const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  for (const lane of ['rental', 'commercial']) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `${lane}-assessment-email-`));
    try {
      const write = (name, data) => fs.writeFileSync(path.join(dir, name), JSON.stringify(data));
      fs.mkdirSync(path.join(dir, 'postcards'));
      write(lane === 'rental' ? 'normalized-source-records.json' : 'source-records.json', []);
      write('summary.json', { cities: [], realtor_runs: [] });
      write('lifecycle-summary.json', { events: [] });
      write('ai-classification-summary.json', { regions: {}, target_count: 0 });
      write(`${lane}-review-queue.json`, []);
      fs.writeFileSync(path.join(dir, `${lane}-review-queue.csv`), 'address\n');
      fs.writeFileSync(path.join(dir, 'current-postcard-output.txt'), 'postcards');
      write(`postcards/${lane}-batch.json`, { recipients: [] });
      const build = require(`./${lane}-email-report.cjs`)[lane === 'rental' ? 'buildRentalReport' : 'buildCommercialReport'];
      // Older saved runs must still be reportable without assessment files.
      const legacy = await build(dir);
      assert(!legacy.attachments.some(a => a.filename === 'run-assessment.json'));
      const files = {
        'run-assessment.md': '# Weekly assessment\nNo recipients qualified.',
        'run-assessment.json': '{"qualified":0}',
        'assessment-error.json': '{"error":"History unavailable"}',
        'partnership-sync-error.json': '{"error":"CRM unavailable"}',
      };
      for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), content);
      const report = await build(dir);
      for (const [name, content] of Object.entries(files)) {
        const attachments = report.attachments.filter(a => a.filename === name);
        assert.equal(attachments.length, 1, `${lane}: include ${name} once even with zero recipients`);
        assert.equal(Buffer.from(attachments[0].content, 'base64').toString(), content);
      }
      assert.deepEqual(report.to, legacy.to);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
  console.log('Rental and commercial reports preserve assessments and failure diagnostics, including empty and historical runs.');
})().catch(error => { console.error(error); process.exitCode = 1; });
