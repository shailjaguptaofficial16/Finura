# Trend Analytics

**Method:** `GET /api/analytics/trends`

Returns chronological monthly income, expenses, savings, and cash flow plus current/previous comparisons, percentage change, status (`increasing`, `decreasing`, `stable`), best month, and worst month.

Savings is `income - expenses`. Transfers are excluded. Filters: `startDate`, `endDate`, `accountId`, `category`.
