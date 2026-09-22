import React, { useCallback, useEffect, useState } from 'react';
import { Download, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'react-toastify';
import analyticsService from '../../services/analyticsService';
import './AnalyticsPage.css';

const money = (value) => {
  const amount = Number(value || 0);
  const sign = amount < 0 ? '-' : '';
  return `${sign}₹${Math.abs(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

export default function Reports() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await analyticsService.getReportsAnalytics({ reportType: 'monthly-summary' });
      setReportData(response.data || null);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const exportReport = async () => {
    setGenerating(true);
    try {
      const response = await analyticsService.exportAnalytics({ reportType: 'monthly-summary', format: 'pdf' });
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `finura-monthly-summary.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Monthly report PDF downloaded successfully.');
    } catch (requestError) {
      const message = requestError.response?.data?.message || 'Export failed';
      setError(message);
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <main className="analytics-page">
        <div className="analytics-shell">
          <div className="analytics-loading">
            <i />
            <i />
            <i />
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="analytics-page">
        <div className="analytics-shell">
          <section className="analytics-state analytics-error">
            <h2>Reports unavailable</h2>
            <p>{error}</p>
            <button type="button" onClick={load}>Retry</button>
          </section>
        </div>
      </main>
    );
  }

  const summary = reportData?.summary || {};
  const incomeRows = reportData?.income || [];
  const expenseRows = reportData?.expenses || [];
  const categoryRows = reportData?.categories || [];
  const accountRows = reportData?.accounts || [];
  const overviewRows = [
    ['Total Income', summary.totalIncome || 0],
    ['Total Expenses', summary.totalExpenses || 0],
    ['Savings', summary.totalSavings || 0],
    ['Net Cash Flow', summary.netCashFlow || 0],
  ];
  const period = reportData?.period || {};

  return (
    <main className="analytics-page">
      <div className="analytics-shell">
        <header className="analytics-header">
          <div>
            <span>Finura Reports</span>
            <h1>Monthly Financial Report</h1>
            <p>
              {period.startDate && period.endDate ? `Period: ${period.startDate} to ${period.endDate}` : 'Live financial summary from your connected accounts.'}
            </p>
          </div>
          <div className="analytics-actions">
            <button type="button" onClick={load} aria-label="Refresh report data">
              <RefreshCw size={16} />
            </button>
            <button type="button" onClick={exportReport} disabled={generating}>
              <Download size={16} />
              {generating ? 'Generating PDF...' : 'Export PDF'}
            </button>
          </div>
        </header>

        <section className="analytics-card-grid">
          {overviewRows.map(([label, value]) => (
            <article key={label} className={`analytics-metric ${label.toLowerCase().includes('expense') ? 'expense' : label === 'Net Cash Flow' || label === 'Savings' ? 'positive' : ''}`}>
              <span>{label}</span>
              <strong>{money(value)}</strong>
            </article>
          ))}
        </section>

        <section className="analytics-grid-section">
          <article className="analytics-panel">
            <div className="analytics-panel-heading">
              <div>
                <span>Income sources</span>
                <h2>Revenue mix</h2>
              </div>
              <strong>{money(summary.totalIncome)}</strong>
            </div>
            <div className="analytics-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Amount</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {incomeRows.length === 0 ? (
                    <tr><td colSpan="3">No income available</td></tr>
                  ) : incomeRows.map((row) => (
                    <tr key={row.source || row.category || row._id || row.name}>
                      <td>{row.source || row.category || 'Income'}</td>
                      <td>{money(row.amount || row.totalAmount || 0)}</td>
                      <td>{Number(row.percentage || 0).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="analytics-panel">
            <div className="analytics-panel-heading">
              <div>
                <span>Expense categories</span>
                <h2>Spending mix</h2>
              </div>
              <strong>{money(summary.totalExpenses)}</strong>
            </div>
            <div className="analytics-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseRows.length === 0 ? (
                    <tr><td colSpan="3">No expense data available</td></tr>
                  ) : expenseRows.map((row) => (
                    <tr key={row.category || row._id || row.name}>
                      <td>{row.category || 'Expense'}</td>
                      <td>{money(row.totalAmount || row.amount || 0)}</td>
                      <td>{Number(row.percentage || 0).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>

        <section className="analytics-grid-section">
          <article className="analytics-panel analytics-table-panel">
            <div className="analytics-panel-heading">
              <div>
                <span>Top categories</span>
                <h2>Category breakdown</h2>
              </div>
              <strong>{money(categoryRows.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0))}</strong>
            </div>
            <div className="analytics-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Total</th>
                    <th>Transactions</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryRows.length === 0 ? (
                    <tr><td colSpan="3">No category breakdown</td></tr>
                  ) : categoryRows.map((row) => (
                    <tr key={row.category || row._id || row.name}>
                      <td>{row.category || 'Category'}</td>
                      <td>{money(row.totalAmount || 0)}</td>
                      <td>{row.transactionCount || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="analytics-panel analytics-table-panel">
            <div className="analytics-panel-heading">
              <div>
                <span>Account snapshot</span>
                <h2>Cash balances</h2>
              </div>
              <strong>{money(accountRows.reduce((sum, row) => sum + Number(row.currentBalance || row.balance || 0), 0))}</strong>
            </div>
            <div className="analytics-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Type</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {accountRows.length === 0 ? (
                    <tr><td colSpan="3">No active accounts</td></tr>
                  ) : accountRows.map((row) => (
                    <tr key={row.id || row._id || row.name}>
                      <td>{row.name || 'Account'}</td>
                      <td>{row.type || 'Savings'}</td>
                      <td>{money(row.currentBalance || row.balance || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>

        <section className="analytics-panel analytics-table-panel">
          <div className="analytics-panel-heading">
            <div>
              <span>Report summary</span>
              <h2>Monthly highlights</h2>
            </div>
            <div className="analytics-actions" style={{ gap: 6 }}>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                <Sparkles size={12} />
                Live data
              </span>
            </div>
          </div>
          <div className="analytics-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Income</td>
                  <td>{money(summary.totalIncome)}</td>
                  <td className="text-emerald-600">Healthy inflow</td>
                </tr>
                <tr>
                  <td>Expenses</td>
                  <td>{money(summary.totalExpenses)}</td>
                  <td className="text-rose-600">Tracked outflow</td>
                </tr>
                <tr>
                  <td>Net Cash Flow</td>
                  <td>{money(summary.netCashFlow)}</td>
                  <td className={Number(summary.netCashFlow || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {Number(summary.netCashFlow || 0) >= 0 ? 'Positive' : 'Negative'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
