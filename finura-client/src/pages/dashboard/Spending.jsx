import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const IconWallet = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"></path><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"></path><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"></path></svg>;
const IconSpending = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
const IconInvestment = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>;

export default function Spending() {
  // Chart.js Data and Options for Line Chart
  const lineData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [
      {
        label: 'Budget',
        data: [15, 10, 13, 9, 14, 8, 10], // scaled down representing 15k, 10k etc.
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        borderWidth: 3,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#10B981',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Actual',
        data: [18, 12, 16, 14, 17, 13, 15],
        borderColor: '#CBD5E1',
        backgroundColor: 'transparent',
        tension: 0.4,
        borderWidth: 3,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#CBD5E1',
        pointBorderWidth: 2,
        pointRadius: 0, // hide points unless hover
        pointHoverRadius: 6,
      }
    ]
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // We have custom HTML legend
      },
      tooltip: {
        backgroundColor: '#0F172A',
        padding: 12,
        titleFont: { family: 'Inter', size: 13 },
        bodyFont: { family: 'Inter', size: 12 },
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) {
              label += '$' + context.parsed.y + 'k';
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 40,
        ticks: {
          stepSize: 10,
          callback: (value) => `$${value}k`,
          color: '#94A3B8',
          font: { family: 'Inter', size: 11 }
        },
        grid: {
          color: '#F1F5F9',
          drawBorder: false,
        },
        border: { display: false }
      },
      x: {
        ticks: {
          color: '#94A3B8',
          font: { family: 'Inter', size: 12 }
        },
        grid: { display: false },
        border: { display: false }
      }
    },
    animation: {
      duration: 1500,
      easing: 'easeOutQuart'
    }
  };

  // Donut Chart Data
  const donutData = {
    labels: ['Housing', 'Emergency Fund', 'Savings', 'Food', 'Transportation', 'Entertainment'],
    datasets: [
      {
        data: [31, 19, 14, 9, 9, 4],
        backgroundColor: [
          '#10B981', // Green
          '#0EA5E9', // Blue
          '#F59E0B', // Yellow
          '#8B5CF6', // Purple
          '#64748B', // Slate
          '#E2E8F0', // Grey
        ],
        borderWidth: 0,
        hoverOffset: 4,
      }
    ]
  };

  const donutOptions = {
    responsive: true,
    cutout: '75%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0F172A',
        bodyFont: { family: 'Inter', size: 13 },
        callbacks: {
          label: function(context) {
            return ` ${context.label}: ${context.parsed}%`;
          }
        }
      }
    },
    animation: {
      animateScale: true,
      animateRotate: true,
      duration: 1200
    }
  };

  return (
    <div className="dash-scrollable-area animate-fade-in">
      {/* Top KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card animation-delay-1">
          <div className="kpi-header">
            <div className="kpi-title"><IconWallet /> Monthly Budget</div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          </div>
          <div className="kpi-body">
            <div>
              <h2>$7,500</h2>
              <span className="trend-up">+2.1% vs last week</span>
            </div>
            <div className="mini-chart">
              <div className="mini-bar" style={{height: '40%'}}></div>
              <div className="mini-bar" style={{height: '60%'}}></div>
              <div className="mini-bar" style={{height: '50%'}}></div>
              <div className="mini-bar" style={{height: '80%'}}></div>
              <div className="mini-bar" style={{height: '70%'}}></div>
              <div className="mini-bar active" style={{height: '100%'}}></div>
            </div>
          </div>
        </div>

        <div className="kpi-card animation-delay-2">
          <div className="kpi-header">
            <div className="kpi-title"><IconSpending /> Actual Spending</div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          </div>
          <div className="kpi-body">
            <div>
              <h2>$6,845</h2>
              <span className="trend-neutral">97.8% of budget</span>
            </div>
            {/* Simple CSS animation bar for actual spending mockup */}
            <div style={{width: '70px', height: '40px', display: 'flex', alignItems: 'flex-end'}}>
               <svg viewBox="0 0 100 40" style={{width: '100%', height: '100%'}}>
                 <path d="M0 30 L20 20 L40 25 L60 10 L80 15 L100 0" fill="none" stroke="#10B981" strokeWidth="2" />
                 <path d="M0 30 L20 20 L40 25 L60 10 L80 15 L100 0 L100 40 L0 40 Z" fill="url(#grad)" />
                 <defs>
                   <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
                     <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                   </linearGradient>
                 </defs>
               </svg>
            </div>
          </div>
        </div>

        <div className="kpi-card animation-delay-3">
          <div className="kpi-header">
            <div className="kpi-title"><IconInvestment /> Savings Rate</div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          </div>
          <div className="kpi-body">
            <div>
              <h2>23%</h2>
              <span className="trend-neutral">On track for goal</span>
            </div>
            <div className="mini-chart">
              <div className="mini-bar" style={{height: '30%'}}></div>
              <div className="mini-bar" style={{height: '50%'}}></div>
              <div className="mini-bar" style={{height: '40%'}}></div>
              <div className="mini-bar" style={{height: '70%'}}></div>
              <div className="mini-bar" style={{height: '80%'}}></div>
              <div className="mini-bar active" style={{height: '100%'}}></div>
            </div>
          </div>
        </div>
      </div>

      {/* MIDDLE SECTION: Line Chart & Recommendations */}
      <div className="chart-grid-main">
        <div className="white-card animation-delay-4">
          <div className="card-title">
            Budget vs Actual
            <div style={{display: 'flex', gap: '20px', alignItems: 'center'}}>
              <div style={{fontSize: '0.85rem', color: '#64748B', display: 'flex', gap: '15px'}}>
                <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><div style={{width: '8px', height: '8px', borderRadius: '50%', background: '#10B981'}}></div> Budget</span>
                <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><div style={{width: '8px', height: '8px', borderRadius: '50%', background: '#CBD5E1'}}></div> Actual</span>
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '10px'}}>
                <div style={{border: '1px solid #E2E8F0', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', gap: '6px', cursor: 'pointer', alignItems: 'center'}}>Date <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></div>
                <div style={{border: '1px solid #E2E8F0', padding: '4px 8px', borderRadius: '6px', fontSize: '1rem', cursor: 'pointer', color: '#94A3B8'}}>...</div>
              </div>
            </div>
          </div>
          
          <div style={{ width: '100%', height: '260px', position: 'relative', marginTop: '10px' }}>
            <Line data={lineData} options={lineOptions} />
          </div>
        </div>

        <div className="white-card animation-delay-5">
          <div className="card-title">Budget Recommendations <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg></div>
          
          <div className="rec-item">
            <div>
              <div className="rec-header">Food & Dining</div>
              <div className="rec-desc">Based on your actual needs</div>
            </div>
            <div className="rec-amount-box">
              <div className="rec-current">Current: $892</div>
              <div className="rec-save">Save $242/mo</div>
            </div>
          </div>

          <div className="rec-item">
            <div>
              <div className="rec-header">Transportation</div>
              <div className="rec-desc">Consider carpool options</div>
            </div>
            <div className="rec-amount-box">
              <div className="rec-current">Current: $600</div>
              <div className="rec-save">Save $125/mo</div>
            </div>
          </div>

          <div className="rec-item" style={{ borderBottom: 'none' }}>
            <div>
              <div className="rec-header">Shopping</div>
              <div className="rec-desc">Align with historical average</div>
            </div>
            <div className="rec-amount-box">
              <div className="rec-current">Current: $524</div>
              <div className="rec-save">Save $124/mo</div>
            </div>
          </div>

          <div className="total-savings-btn">
            Total Potential Monthly Savings: $491
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: Budget Builder & Insights */}
      <div className="chart-grid-bottom">
        <div className="white-card animation-delay-6 budget-builder-card">
          <div className="card-title budget-builder-heading"><span className="budget-builder-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg></span><span>Zero-Based Budget Builder</span></div>
          <div className="donut-container">
            <div className="donut-chart" style={{background: 'transparent', width: '200px', height: '200px'}}>
              <Doughnut data={donutData} options={donutOptions} />
              <div className="donut-center-text">
                <span className="d-perc">100%</span>
                <span className="d-label">Percentage</span>
              </div>
            </div>
            <div className="donut-legend">
              <div className="legend-item"><span><span className="legend-dot" style={{background: '#10B981'}}></span>Housing</span> <span>31%</span></div>
              <div className="legend-item"><span><span className="legend-dot" style={{background: '#0EA5E9'}}></span>Emergency Fund</span> <span>19%</span></div>
              <div className="legend-item"><span><span className="legend-dot" style={{background: '#F59E0B'}}></span>Savings</span> <span>14%</span></div>
              <div className="legend-item"><span><span className="legend-dot" style={{background: '#8B5CF6'}}></span>Food</span> <span>9%</span></div>
              <div className="legend-item"><span><span className="legend-dot" style={{background: '#64748B'}}></span>Transportation</span> <span>9%</span></div>
              <div className="legend-item"><span><span className="legend-dot" style={{background: '#E2E8F0'}}></span>Entertainment</span> <span>4%</span></div>
            </div>
          </div>
        </div>

        <div className="white-card animation-delay-7">
          <div className="card-title">Zero-Based Budget Builder <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg></div>
          
          <div className="insights-container">
            <div className="insight-item hover-lift">
              <div className="insight-icon blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
              </div>
              <div className="insight-text">
                <h4>Weekend Spending</h4>
                <p>You spend 35% more on weekends than weekdays</p>
              </div>
            </div>

            <div className="insight-item hover-lift">
              <div className="insight-icon green">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>
              </div>
              <div className="insight-text">
                <h4>Coffee Spending Up</h4>
                <p>Your coffee spending is up 40% this month ($127 at Starbucks)</p>
              </div>
            </div>

            <div className="insight-item hover-lift">
              <div className="insight-icon orange">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              </div>
              <div className="insight-text">
                <h4>Dining Savings</h4>
                <p>You could save $240/month by reducing dining out 2x per week</p>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
