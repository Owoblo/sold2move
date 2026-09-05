const crypto = require('crypto');
const { query } = require('./market-db.cjs');
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
async function executeTransaction(statements, { db = query } = {}) {
  const id = crypto.randomUUID();
  const sql = statements.join('\n');
  // Transport chunks remain below the Management API body limit even after JSON/SQL escaping.
  const chunks = sql.match(/[\s\S]{1,40000}/gu) || [];
  try {
    for (let i = 0; i < chunks.length; i++) await db(`INSERT INTO rental_import_chunks(import_id,part,sql_text) VALUES (${quote(id)},${i},${quote(chunks[i])})`);
    await db(`BEGIN;
      DO $rental_import$ DECLARE script text; BEGIN
        SELECT string_agg(sql_text, '' ORDER BY part) INTO script FROM rental_import_chunks WHERE import_id=${quote(id)};
        IF script IS NULL THEN RAISE EXCEPTION 'Rental import staging is empty'; END IF;
        EXECUTE script;
      END $rental_import$;
      DELETE FROM rental_import_chunks WHERE import_id=${quote(id)};
      COMMIT;`);
  } catch (error) {
    await db(`DELETE FROM rental_import_chunks WHERE import_id=${quote(id)}`).catch(() => {});
    throw error;
  }
}
module.exports = { executeTransaction };
