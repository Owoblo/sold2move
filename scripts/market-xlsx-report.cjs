const JSZip = require('jszip');

const RENTAL_COLUMNS = [
  ['Lifecycle', row => row.lifecycle_status || 'active'],
  ['Occupancy / Furnishing', row => row.occupancy_state || 'unknown'],
  ['AI Confidence', row => row.classification_confidence],
  ['AI Evidence', row => row.classification_evidence],
  ['Contact', row => row.contact_name],
  ['Phone', row => row.contact_phone],
  ['Company', row => row.contact_company],
  ['Source', row => row.source],
  ['Source Listing ID', row => row.source_listing_id],
  ['Address', row => [row.street_address, row.city, row.province, row.postal_code].filter(Boolean).join(', ')],
  ['City', row => row.city],
  ['Monthly Rent', row => row.monthly_price],
  ['Bedrooms', row => row.bedrooms],
  ['Bathrooms', row => row.bathrooms],
  ['Categories', row => row.listing_categories],
  ['Property Signals', row => row.property_signals],
  ['Units Available', row => row.units_available],
  ['Listing URL', row => row.source_url],
  ['Description', row => row.description],
];

const COMMERCIAL_COLUMNS = [
  ['Lifecycle', row => row.lifecycle_status || 'active'],
  ['Occupancy / Fit-out', row => row.occupancy_state || 'unknown'],
  ['AI Confidence', row => row.classification_confidence],
  ['AI Evidence', row => row.classification_evidence],
  ['Agent', row => row.agent_name],
  ['Phone', row => row.agent_phone],
  ['Brokerage', row => row.brokerage_name],
  ['Source', row => row.source],
  ['Source Listing ID', row => row.source_listing_id],
  ['Address', row => [row.street_address, row.city, row.province, row.postal_code].filter(Boolean).join(', ')],
  ['City', row => row.city],
  ['Transaction', row => row.transaction_type],
  ['Asset Type', row => row.asset_type],
  ['Title', row => row.title],
  ['Asking Price', row => row.asking_price],
  ['Lease Rate', row => row.lease_rate],
  ['Lease Rate Unit', row => row.lease_rate_unit],
  ['Size Min Sq Ft', row => row.space_size_sqft_min],
  ['Size Max Sq Ft', row => row.space_size_sqft_max],
  ['Listing URL', row => row.source_url],
];

function escapeXml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function columnName(index) {
  let value = index + 1;
  let name = '';
  while (value > 0) {
    value -= 1;
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26);
  }
  return name;
}

function displayValue(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return value ?? '';
}

function cellXml(value, reference, style = 0) {
  const normalized = displayValue(value);
  if (typeof normalized === 'number' && Number.isFinite(normalized)) {
    return `<c r="${reference}" s="${style}"><v>${normalized}</v></c>`;
  }
  return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(normalized).slice(0, 32767))}</t></is></c>`;
}

async function buildMarketWorkbook(lane, records, lifecycleEvents = [], coverageRows = []) {
  const columns = lane === 'rental' ? RENTAL_COLUMNS : COMMERCIAL_COLUMNS;
  const lifecycleByRecord = new Map(lifecycleEvents.map(event => [
    `${event.source}|${event.source_listing_id}`, event.event_type,
  ]));
  const rows = records.map(record => ({
    ...record,
    lifecycle_status: lifecycleByRecord.get(`${record.source}|${record.source_listing_id}`) || 'still_active',
  })).sort((a, b) => {
    const aContact = Number(Boolean(a.agent_phone || a.contact_phone || a.agent_name || a.contact_name));
    const bContact = Number(Boolean(b.agent_phone || b.contact_phone || b.agent_name || b.contact_name));
    if (aContact !== bContact) return bContact - aContact;
    return String(a.city || '').localeCompare(String(b.city || '')) ||
      String(a.source || '').localeCompare(String(b.source || ''));
  });
  const header = columns.map(([label], index) => cellXml(label, `${columnName(index)}1`, 1)).join('');
  const body = rows.map((row, rowIndex) => {
    const cells = columns.map(([, getter], columnIndex) =>
      cellXml(getter(row), `${columnName(columnIndex)}${rowIndex + 2}`)
    ).join('');
    return `<row r="${rowIndex + 2}">${cells}</row>`;
  }).join('');
  const lastColumn = columnName(columns.length - 1);
  const widths = columns.map(([label], index) => {
    const width = Math.min(60, Math.max(12, label.length + 3,
      ...rows.slice(0, 250).map(row => String(displayValue(columns[index][1](row))).length + 2)));
    return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
  }).join('');
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>${widths}</cols>
  <sheetData><row r="1">${header}</row>${body}</sheetData>
  <autoFilter ref="A1:${lastColumn}${rows.length + 1}"/>
</worksheet>`;
  const coverageColumns = [
    ['Region', row => row.region_label || row.region],
    ['Requested City / Community', row => row.city],
    ['Acquisition Status', row => row.status],
    ['Source Records', row => row.source_records ?? 0],
    ['Canonical Properties', row => row.canonical_properties ?? ''],
    ['Spacelist Pages', row => row.spacelist_pages ?? ''],
    ['Coverage Error', row => row.error || ''],
  ];
  const coverageHeader = coverageColumns.map(([label], index) =>
    cellXml(label, `${columnName(index)}1`, 1)).join('');
  const coverageBody = coverageRows.map((row, rowIndex) =>
    `<row r="${rowIndex + 2}">${coverageColumns.map(([, getter], columnIndex) =>
      cellXml(getter(row), `${columnName(columnIndex)}${rowIndex + 2}`)).join('')}</row>`).join('');
  const coverageSheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>${coverageColumns.map((_, index) => `<col min="${index + 1}" max="${index + 1}" width="${index === 1 ? 34 : 22}" customWidth="1"/>`).join('')}</cols>
  <sheetData><row r="1">${coverageHeader}</row>${coverageBody}</sheetData>
  <autoFilter ref="A1:G${coverageRows.length + 1}"/>
</worksheet>`;
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);
  zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="${lane === 'rental' ? 'Rental Inventory' : 'Commercial Inventory'}" sheetId="1" r:id="rId1"/><sheet name="Market Coverage" sheetId="2" r:id="rId3"/></sheets>
</workbook>`);
  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
</Relationships>`);
  zip.file('xl/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Aptos"/></font></fonts>
  <fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF17324D"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>
</styleSheet>`);
  zip.file('xl/worksheets/sheet1.xml', sheet);
  zip.file('xl/worksheets/sheet2.xml', coverageSheet);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function recordsForEvents(events) {
  return events.map(event => ({ ...(event.record || {}), source: event.source,
    source_listing_id: event.source_listing_id, city: event.city }));
}

module.exports = { buildMarketWorkbook, recordsForEvents };
