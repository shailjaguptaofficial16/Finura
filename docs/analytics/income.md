# Income Analytics

**Method:** `GET /api/analytics/income`

Returns total income, monthly average, transaction count, source/category breakdown, and monthly trend. Only `income` transactions are included; transfers, expenses, and investment sells are excluded from income behavior analytics.

Filters: `startDate`, `endDate`, `accountId`, `category`. Empty data returns zero summary, empty `sources` and `monthlyTrend`, and `metadata.hasData: false`.
