const { getReportsAnalytics, REPORT_TYPES } = require('./reportsAnalyticsService');

const FORMATS = ['json', 'csv', 'pdf'];
const csvEscape = (value) => {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
const dateStamp = () => new Date().toISOString().slice(0, 10);
const getRows = (report) => report.monthly?.length ? report.monthly : report.categories?.length ? report.categories : report.accounts?.length ? report.accounts : report.investments || [];
const buildCsv = (report) => {
  const rows = getRows(report);
  const keys = rows.length ? [...new Set(rows.flatMap((row) => Object.keys(row)))] : ['message'];
  const body = rows.length ? rows.map((row) => keys.map((key) => csvEscape(row[key])).join(',')) : ['No data available'];
  return [keys.join(','), ...body].join('\n');
};
const escapePdf = (value) => String(value || '').replace(/[\\()]/g, '\\$&').replace(/\r?\n/g, ' ');
const buildPdf = (report) => {
  const lines = [
    'FINURA ANALYTICS REPORT',
    `Period: ${report.period.startDate} to ${report.period.endDate}`,
    `Income: ${report.summary.totalIncome}`,
    `Expenses: ${report.summary.totalExpenses}`,
    `Savings: ${report.summary.totalSavings}`,
    `Net Cash Flow: ${report.summary.netCashFlow}`,
    `Generated: ${new Date().toISOString()}`,
  ];
  const stream = `BT /F1 12 Tf 50 760 Td ${lines.map((line, index) => `(${escapePdf(line)}) Tj ${index < lines.length - 1 ? '0 -20 Td' : ''}`).join(' ')} ET`;
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, index) => { offsets[index + 1] = Buffer.byteLength(pdf, 'binary'); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf, 'binary'); pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'binary');
};

const exportAnalytics = async ({ userId, filters, reportType = 'monthly-summary', format = 'json' }) => {
  if (!REPORT_TYPES.includes(reportType)) { const error = new Error('Invalid reportType'); error.statusCode = 400; error.errorCode = 'INVALID_REPORT_TYPE'; throw error; }
  if (!FORMATS.includes(format)) { const error = new Error('Unsupported export format'); error.statusCode = 400; error.errorCode = 'INVALID_EXPORT_FORMAT'; throw error; }
  const report = await getReportsAnalytics({ userId, filters, reportType });
  const filename = `finura-${reportType}-${dateStamp()}.${format}`;
  if (format === 'csv') return { filename, contentType: 'text/csv; charset=utf-8', content: buildCsv(report) };
  if (format === 'pdf') return { filename, contentType: 'application/pdf', content: buildPdf(report) };
  return { filename, contentType: 'application/json; charset=utf-8', content: { reportType, period: report.period, summary: report.summary, rows: getRows(report) } };
};

module.exports = { exportAnalytics, FORMATS };