import React from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { CSVLink } from 'react-csv';
import { toast } from 'react-toastify';

const IconDownload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

const IconFileText = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

export default function ExportReport({ transactions = [] }) {
  const userName = localStorage.getItem('finura-user-name') || 'Finura Member';

  const handleDownloadPDF = () => {
    if (!transactions.length) return;

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('Transaction History Report', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Account: ${userName}`, 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 36);

    // Table
    const tableColumn = ["Date", "Description", "Category", "Type", "Amount"];
    const tableRows = [];

    transactions.forEach(trx => {
      const trxData = [
        new Date(trx.date).toLocaleDateString(),
        trx.title,
        trx.category,
        trx.type,
        `$${trx.amount.toFixed(2)}`
      ];
      tableRows.push(trxData);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [16, 185, 129], textColor: 255 }, // Emerald-500 header
      alternateRowStyles: { fillColor: [248, 250, 252] }, // slate-50
    });

    doc.save(`Finura_Transactions_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF report downloaded successfully!');
  };

  const csvHeaders = [
    { label: "Date", key: "date" },
    { label: "Description", key: "title" },
    { label: "Category", key: "category" },
    { label: "Type", key: "type" },
    { label: "Amount", key: "amount" }
  ];

  // Format data for CSV
  const csvData = transactions.map(trx => ({
    ...trx,
    date: new Date(trx.date).toLocaleDateString(),
    amount: trx.amount.toFixed(2)
  }));

  const buttonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'white',
    border: '1px solid var(--color-border, #e2e8f0)',
    padding: '8px 16px',
    borderRadius: '8px',
    color: 'var(--color-text-dark, #0f172a)',
    fontWeight: 500,
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'all 0.2s',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
  };

  return (
    <div style={{ display: 'flex', gap: '12px' }}>
      <button 
        onClick={handleDownloadPDF} 
        style={buttonStyle}
        onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
        onMouseOut={e => e.currentTarget.style.background = 'white'}
        disabled={transactions.length === 0}
      >
        <IconFileText /> PDF Report
      </button>

      <CSVLink
        data={csvData}
        headers={csvHeaders}
        filename={`Finura_Transactions_${new Date().toISOString().split('T')[0]}.csv`}
        style={{ textDecoration: 'none' }}
        onClick={() => toast.success('CSV report downloaded successfully!')}
      >
        <div 
          style={buttonStyle}
          onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
          onMouseOut={e => e.currentTarget.style.background = 'white'}
        >
          <IconDownload /> Export CSV
        </div>
      </CSVLink>
    </div>
  );
}
