# Finura Client Demo Flow

## Demo Account

- Email: `demo@finura.app`
- Password: `DemoPassword123!`
- Currency: INR

Run `npm run seed-demo` from the workspace root before presenting. This refreshes the demo user and loads accounts, transactions, budgets, goals, investments, liabilities, a recurring payment, and notifications.

## Presentation Journey

1. Login with the demo account.
2. Open Dashboard Overview and explain the health, income, expense, cashflow, and net-worth cards.
3. Open Getting Started to show the guided setup path.
4. Create or inspect an account under Money > Accounts.
5. Add an income transaction, then an expense transaction.
6. Open Money > Budgets and show the budget warning state.
7. Open Planning > Goals and show goal progress.
8. Open Analytics > Overview, then apply a date or category filter.
9. Open Wealth and explain assets minus liabilities.
10. Open Finura AI and ask for a spending or allocation insight.
11. Open Analytics > Reports and export a report.
12. Open Settings > Profile and Security before logging out.

## Presenter Checks

- Refresh preserves authentication and returns to the current protected route.
- Empty financial values render as `₹0.00`.
- Income is positive, expenses are negative only when displayed, and cashflow is income minus expenses.
- AI shows a retryable error state when the service is unavailable.
- Mobile navigation opens as an overlay and can be closed with Escape or the close button.
- `npm run build` passes before the presentation.
