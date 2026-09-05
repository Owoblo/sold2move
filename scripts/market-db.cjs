async function query(sql, { fetchImpl = fetch } = {}) {
  const project = process.env.SUPABASE_PROJECT_REF;
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!project || !token) throw new Error('SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN are required');
  const response = await fetchImpl(`https://api.supabase.com/v1/projects/${encodeURIComponent(project)}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }), signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403
    ? 'Supabase access rejected: update the GitHub SUPABASE_ACCESS_TOKEN secret with project access.'
    : `Supabase database request failed (HTTP ${response.status}): ${(await response.text()).slice(0, 500)}`);
  return response.json();
}
if (require.main === module) query('SELECT 1 AS connected').then(() => console.log('Supabase access verified; no acquisition started.')).catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { query };
