const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const clean = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const percent = (n, total) => total ? Math.round(n / total * 1000) / 10 : null;
function serviceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
}
function propertyKey(row) {
  const street = row.addressstreet || row.street_address || row.canonical_address || row.address || row.address_key;
  if (!street) return `id:${row.source || 'zillow'}:${row.zpid || row.source_listing_id || row.id}`;
  const { normalizeAddressKey } = require('./postcard-step5-output.cjs');
  return normalizeAddressKey({ addressstreet: street, addresszipcode: row.addresszipcode || row.postal_code || '' })
    + `|${clean(row.city || row.addresscity)}|${clean(row.province || row.addressstate || 'ON')}`;
}
function onePiecePerProperty(rows) {
  const kept = [], rejected = [], seen = new Set();
  for (const row of [...rows].sort((a, b) => Number(b.status === 'sold') - Number(a.status === 'sold'))) {
    const key = propertyKey(row);
    if (seen.has(key)) rejected.push({ zpid: row.zpid, reason: 'same_batch_property_already_selected' });
    else { seen.add(key); kept.push(row); }
  }
  return { kept, rejected };
}
function snapshot(rows) {
  return rows.map(row => ({ key: propertyKey(row), id: String(row.zpid || row.source_listing_id || row.id || ''),
    status: row.status || row.transaction_type || 'available', city: row.city || row.addresscity || '',
    address: row.addressstreet || row.canonical_address || row.address || row.address_key || '',
    observed_at: row.lastseenat || row.last_seen_at || null,
    event_at: row.zillow_date_posted || row.first_seen_at || null }));
}
function assess({ runId, lane, region, observedAt, scope, candidates, selected, rejected = [], health = {}, prior = [], sourceCount = null }) {
  const rows = snapshot(selected), inputs = snapshot(candidates), keys = new Set(rows.map(r => r.key));
  const scopeKey = digest(scope);
  const history = prior.filter(p => p.run_id !== runId && p.lane === lane && p.region === region && p.scope_key === scopeKey && p.observed_at < observedAt)
    .sort((a, b) => b.observed_at.localeCompare(a.observed_at)).slice(0, 2);
  const reasons = {};
  rejected.forEach(r => { const reason = r.reason || r.rejection_reason || 'unspecified'; reasons[reason] = (reasons[reason] || 0) + 1; });
  const comparisons = history.map(p => {
    const previous = p.snapshot || [], oldKeys = new Set(previous.map(r => r.key));
    const overlap = rows.filter(r => oldKeys.has(r.key));
    return { run_id: p.run_id, previous_count: previous.length, current_count: rows.length,
      count_change_percent: percent(rows.length - previous.length, previous.length),
      overlap_count: overlap.length, overlap_percent: percent(overlap.length, rows.length),
      repeated_same_status: overlap.filter(r => previous.some(x => x.key === r.key && x.status === r.status)),
      changed_status: overlap.filter(r => previous.some(x => x.key === r.key && x.status !== r.status)),
      no_longer_selected: previous.filter(r => !keys.has(r.key)),
      days_since_run: Math.round((Date.parse(observedAt) - Date.parse(p.observed_at)) / 8640000) / 10 };
  });
  const byStatus = {};
  rows.forEach(r => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });
  const report = { advisory_only: true, source_count: sourceCount, candidate_count: inputs.length,
    selected_count: rows.length, selection_percent: percent(rows.length, inputs.length),
    duplicate_property_count: rows.length - keys.size, selected_by_status: byStatus,
    rejected_count: rejected.length, rejected_by_reason: reasons,
    comparisons, comparable_history_count: history.length, scope, health,
    coverage_note: 'Coverage describes observed inventory. Undiscovered listings and true market share cannot be measured without an independent source.',
    status_note: lane === 'residential' ? 'Sold follows the existing first-disappearance rule; it is inferred, not independently confirmed.' : 'Lease/sale is the advertised transaction, not proof of a completed transaction.',
    missing_history: history.length < 2,
  };
  return { run_id: runId, lane, region, observed_at: observedAt, scope_key: scopeKey, report, snapshot: rows };
}
function markdown(a) {
  const r = a.report;
  return `# ${a.lane} assessment — ${a.region}\n\nRun: ${a.run_id}\n\n${r.selected_count} selected from ${r.candidate_count} candidates (${r.selection_percent ?? 'unknown'}%). ${r.duplicate_property_count} duplicate properties in final output.\n\n${r.status_note}\n\nComparable prior runs available: ${r.comparable_history_count}/2.\n\n${r.comparisons.map(c => `- ${c.run_id}: ${c.previous_count} → ${c.current_count}; change ${c.count_change_percent ?? 'N/A'}%; overlap ${c.overlap_count} (${c.overlap_percent ?? 'N/A'}%); same-status repeats ${c.repeated_same_status.length}.`).join('\n')}\n\nExclusions:\n${Object.entries(r.rejected_by_reason).map(([k,v]) => `- ${k}: ${v}`).join('\n') || '- None recorded'}\n\n${r.coverage_note}\n\nThis assessment does not change qualification or reject listings.\n`;
}
async function writeAssessment(input, outputDir, { persist = true } = {}) {
  const db = persist ? serviceClient() : null;
  let prior = [], historyError = null;
  if (db) {
    const { data, error } = await db.from('pipeline_assessments').select('*').eq('lane', input.lane).eq('region', input.region)
      .eq('scope_key', digest(input.scope)).lt('observed_at', input.observedAt).order('observed_at', { ascending: false }).limit(2);
    if (error) historyError = error.message; else prior = data || [];
  }
  const assessment = assess({ ...input, prior });
  assessment.report.history_error = historyError || (!db && persist ? 'Database credentials unavailable' : null);
  fs.writeFileSync(path.join(outputDir, 'run-assessment.json'), JSON.stringify(assessment, null, 2));
  fs.writeFileSync(path.join(outputDir, 'run-assessment.md'), markdown(assessment));
  if (db) { const { error } = await db.from('pipeline_assessments').upsert(assessment); if (error) throw new Error(`Assessment persistence failed: ${error.message}`); }
  return assessment;
}
async function filterPrintClaims(rows) {
  const db = serviceClient();
  if (!db) throw new Error('SUPABASE_SERVICE_ROLE_KEY required for durable print duplicate checks');
  const kept = [], rejected = [], claims = new Set();
  for (let i = 0; i < rows.length; i += 100) {
    const { data, error } = await db.from('postcard_print_claims').select('property_key,postcard_type').in('property_key', rows.slice(i,i+100).map(propertyKey));
    if (error) throw new Error(`Print history unavailable: ${error.message}`);
    (data || []).forEach(c => claims.add(`${c.property_key}|${c.postcard_type}`));
  }
  for (const row of rows) {
    if (claims.has(`${propertyKey(row)}|${row.status === 'sold' ? 'sold' : 'just_listed'}`)) rejected.push({ zpid: row.zpid, reason: 'already_reserved_or_submitted_to_printer' });
    else kept.push(row);
  }
  return { kept, rejected };
}
module.exports = { serviceClient, propertyKey, onePiecePerProperty, snapshot, assess, markdown, writeAssessment, filterPrintClaims, digest, clean };
