// Finura dashboard rendering and JSON-backed data loading
let growthChart = null;

const fallbackDashboardData = {
    profile: { name: 'User', tier: 'Pro' },
    stats: {
        totalBalance: 14250.5,
        totalInvestments: 8400,
        monthlySpend: 1250,
        balanceGrowthPercentage: 4.2
    },
    chartData: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        data: [5000, 7000, 6500, 9000, 11000, 14250]
    },
    transactions: [
        { title: 'Bought Bitcoin', date: '2026-07-05', status: 'Success', amount: -320.5 },
        { title: 'Stock Dividend', date: '2026-07-02', status: 'Success', amount: 125 },
        { title: 'Wallet Deposit', date: '2026-06-28', status: 'Pending', amount: 1500 },
        { title: 'Cloud Subscription', date: '2026-06-24', status: 'Success', amount: -19.99 }
    ]
};

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});

async function initDashboard() {
    const logoutBtn = document.getElementById('dashboard-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (typeof API !== 'undefined' && API.logout) {
                await API.logout();
            }
            window.location.href = 'index.html';
        });
    }

    try {
        const data = await fetchDashboardData();
        renderDashboard(data);
    } catch (error) {
        console.warn('Dashboard fallback activated:', error);
        renderDashboard(fallbackDashboardData);
    }
}

async function fetchDashboardData() {
    const endpoint = 'http://localhost:3000/db';

    try {
        const response = await fetch(endpoint);
        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();
        return normalizeDashboardData(data);
    } catch (error) {
        console.error('Unable to fetch dashboard data:', error);
        throw error;
    }
}

function normalizeDashboardData(data) {
    const profile = data?.profile || fallbackDashboardData.profile;
    const stats = data?.stats || fallbackDashboardData.stats;
    const chartData = data?.chartData || fallbackDashboardData.chartData;
    const transactions = Array.isArray(data?.transactions) && data.transactions.length
        ? data.transactions
        : fallbackDashboardData.transactions;

    return {
        profile: {
            name: profile.name || fallbackDashboardData.profile.name,
            tier: profile.tier || fallbackDashboardData.profile.tier
        },
        stats: {
            totalBalance: Number(stats.totalBalance || 0),
            totalInvestments: Number(stats.totalInvestments || 0),
            monthlySpend: Number(stats.monthlySpend || 0),
            balanceGrowthPercentage: Number(stats.balanceGrowthPercentage || 0)
        },
        chartData: {
            labels: Array.isArray(chartData.labels) && chartData.labels.length ? chartData.labels : fallbackDashboardData.chartData.labels,
            data: Array.isArray(chartData.data) && chartData.data.length ? chartData.data : fallbackDashboardData.chartData.data
        },
        transactions
    };
}

function renderDashboard(data) {
    updateHeader(data.profile);
    updateStats(data.stats);
    renderTransactions(data.transactions);
    renderGrowthChart(data.chartData);
}

function updateHeader(profile) {
    const welcomeLabel = document.getElementById('welcome-label');
    if (welcomeLabel) {
        const firstName = (profile?.name || 'User').split(' ')[0];
        welcomeLabel.textContent = `Welcome back, ${firstName}!`;
    }
}

function updateStats(stats) {
    const balanceEl = document.getElementById('stat-balance');
    const investmentsEl = document.getElementById('stat-investments');
    const spendEl = document.getElementById('stat-spend');

    if (balanceEl) balanceEl.textContent = formatCurrency(stats.totalBalance);
    if (investmentsEl) investmentsEl.textContent = formatCurrency(stats.totalInvestments);
    if (spendEl) spendEl.textContent = formatCurrency(stats.monthlySpend);
}

function renderTransactions(transactions) {
    const tbody = document.getElementById('transactions-body');
    if (!tbody) return;

    if (!transactions || !transactions.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="table-empty">No recent activity yet.</td></tr>';
        return;
    }

    tbody.innerHTML = transactions.slice(0, 5).map((tx) => {
        const amountClass = tx.amount >= 0 ? 'amount-positive' : 'amount-negative';
        const sign = tx.amount >= 0 ? '+' : '-';
        const badgeClass = tx.status && tx.status.toLowerCase() === 'pending' ? 'pending' : 'success';

        return `
            <tr>
                <td>${tx.title || tx.type || 'Transaction'}</td>
                <td>${tx.date || '—'}</td>
                <td><span class="status-badge ${badgeClass}">${tx.status || 'Success'}</span></td>
                <td class="${amountClass}">${sign}${formatCurrency(Math.abs(tx.amount))}</td>
            </tr>
        `;
    }).join('');
}

function renderGrowthChart(chartData) {
    const ctx = document.getElementById('investment-growth-chart');
    if (!ctx) return;

    if (growthChart) {
        growthChart.destroy();
    }

    growthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Investment Growth',
                data: chartData.data,
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.16)',
                tension: 0.38,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: '#0F172A',
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: (value) => '$' + value.toLocaleString()
                    },
                    grid: {
                        color: 'rgba(148, 163, 184, 0.18)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function formatCurrency(value) {
    return `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
