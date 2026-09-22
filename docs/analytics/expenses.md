# Expense Analytics

**Method:** `GET /api/analytics/expenses`

Returns total expenses, monthly average, transaction count, recurring/one-time split, growth percentage, category breakdown, monthly trend, and `largestExpense`.

Transfers and investment activity are excluded from normal expense behavior. Missing categories become `Other`. Filters: `startDate`, `endDate`, `accountId`, `category`.
