# Category Analytics

**Method:** `GET /api/analytics/categories`

Filters: `startDate`, `endDate`, `accountId`, `category`, `type=income|expense`, and positive integer `limit`. Categories are sorted by descending amount and include amount, count, percentage, and average transaction. Monthly category trends and growth are included.

Missing `type` defaults to expense categories; `incomeExpense` contains both separated views. Empty data returns empty arrays and null top/lowest categories.
