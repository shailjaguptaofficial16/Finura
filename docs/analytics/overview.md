# Analytics Overview

**Method:** `GET /api/analytics/overview`

**Authentication:** Bearer token required.

**Query:** `startDate`, `endDate`, `accountId`, `category`.

**Response:** `data.summary` contains `totalIncome`, `totalExpense`, and `netCashFlow`; `breakdown` contains expense categories; `trends` contains chronological monthly rows; `metadata` contains normalized dates, currency, and `hasData`.

**Authorization:** The authenticated user is the only data scope. A foreign `accountId` returns `403`.
