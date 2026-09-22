# Analytics API Contract

All endpoints require `Authorization: Bearer <token>` and return `{ success, data }` on success or `{ success: false, message, errorCode }` on failure.

Common query parameters: `startDate`, `endDate`, `accountId`, `category`. Missing dates default to the last 30 days. Dates use UTC boundaries. Ranges over 366 days are rejected.

Validation errors return `400`; foreign account filters return `403`; missing or invalid tokens return `401`; unexpected failures return a generic `500` response. Analytics queries always scope records to the authenticated user and never mutate financial data.

Classification: transfers are excluded from income/expense analytics; investment activity follows the cash-flow policy; missing categories use `Other`; empty data returns zero summaries and empty arrays with `metadata.hasData: false`.

Currency is `INR`, amounts are rounded to two decimals, and export formats are `json`, `csv`, and `pdf`.
