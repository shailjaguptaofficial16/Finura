# Cash Flow Analytics

**Method:** `GET /api/analytics/cash-flow`

Returns inflow, outflow, net cash flow, average monthly cash flow, positive/negative/neutral months, consistency, largest movements, and monthly status rows.

Income is inflow, normal expenses and investment buys are outflow, investment sells are inflow net of fees, and transfers are excluded. Filters: `startDate`, `endDate`, `accountId`.
