# Analytics Export

**Method:** `GET /api/analytics/export`

Required query parameters: `format=json|csv|pdf`; optional `reportType`, `startDate`, `endDate`, `accountId`, and `category`.

JSON returns `{ success, data: { reportType, period, summary, rows } }`. CSV and PDF return attachment responses with filename `finura-{reportType}-{YYYY-MM-DD}.{format}`. CSV headers are stable and formula-like values are sanitized. Empty reports remain valid exports. Export uses the same authentication, ownership, date-range, and report-type validation as Reports Analytics.
