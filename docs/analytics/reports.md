# Reports Analytics

**Method:** `GET /api/analytics/reports`

Optional `reportType`: `monthly-summary`, `income-expense`, `cash-flow`, `category-breakdown`, `account-summary`, `planning-summary`, or `investment-summary`.

Returns a stable export-ready object containing period, summary, income, expenses, categories, accounts, investments, planning, monthly, cash-flow, and metadata sections. Invalid report types return `400` with `INVALID_REPORT_TYPE`.
