import React from 'react';

/**
 * CardSkeleton - For KPI summary cards
 */
export function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 space-y-4 shadow-sm h-36 flex flex-col justify-between animate-pulse"
        >
          <div className="flex justify-between items-center">
            <div className="h-4 w-28 bg-slate-200 rounded" />
            <div className="h-5 w-16 bg-slate-100 rounded-full" />
          </div>
          <div className="h-8 w-36 bg-slate-200 rounded-lg" />
          <div className="h-3 w-32 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  );
}

/**
 * ChartSkeleton - For Bar, Line, or Donut charts
 */
export function ChartSkeleton({ type = 'bar', height = 'h-72', className = '' }) {
  if (type === 'donut' || type === 'pie') {
    return (
      <div className={`bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 space-y-4 shadow-sm animate-pulse flex flex-col justify-between ${className}`}>
        <div className="space-y-1.5">
          <div className="h-5 w-40 bg-slate-200 rounded" />
          <div className="h-3 w-28 bg-slate-100 rounded" />
        </div>
        <div className="h-44 w-44 mx-auto rounded-full bg-slate-100 border-8 border-slate-200/60 my-2" />
        <div className="space-y-2 pt-3 border-t border-slate-100">
          <div className="h-3 w-full bg-slate-100 rounded" />
          <div className="h-3 w-3/4 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 space-y-4 shadow-sm animate-pulse flex flex-col justify-between ${className}`}>
      <div className="flex justify-between items-center">
        <div className="space-y-1.5">
          <div className="h-5 w-40 bg-slate-200 rounded" />
          <div className="h-3 w-48 bg-slate-100 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-4 w-16 bg-slate-100 rounded" />
          <div className="h-4 w-16 bg-slate-100 rounded" />
        </div>
      </div>
      <div className={`w-full ${height} bg-slate-100/80 rounded-xl flex items-end gap-3 p-4`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-1 flex gap-1 items-end h-full">
            <div
              className="w-1/2 bg-slate-200 rounded-t"
              style={{ height: `${30 + (i * 12) % 65}%` }}
            />
            <div
              className="w-1/2 bg-slate-200/60 rounded-t"
              style={{ height: `${20 + (i * 15) % 55}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * TableSkeleton - For Transactions or Ledger tables
 */
export function TableSkeleton({ rows = 5, columns = 5 }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 space-y-4 shadow-sm animate-pulse">
      <div className="flex justify-between items-center">
        <div className="space-y-1.5">
          <div className="h-5 w-44 bg-slate-200 rounded" />
          <div className="h-3 w-32 bg-slate-100 rounded" />
        </div>
        <div className="h-8 w-28 bg-slate-100 rounded-xl" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200/80">
        <div className="p-3 bg-slate-50 border-b border-slate-200/80 flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="h-4 bg-slate-200 rounded flex-1" />
          ))}
        </div>
        <div className="divide-y divide-slate-100 p-2 space-y-2">
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="flex items-center gap-4 py-2.5 px-2">
              <div className="h-4 w-20 bg-slate-100 rounded" />
              <div className="h-4 w-40 bg-slate-200 rounded flex-1" />
              <div className="h-4 w-24 bg-slate-100 rounded" />
              <div className="h-4 w-16 bg-slate-100 rounded" />
              <div className="h-4 w-20 bg-slate-200 rounded ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * ListSkeleton - For Budgets, Goals, Accounts, or Item Lists
 */
export function ListSkeleton({ count = 3, className = '' }) {
  return (
    <div className={`space-y-3 animate-pulse ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
            <div className="space-y-2 flex-1 min-w-0">
              <div className="h-4 w-36 bg-slate-200 rounded" />
              <div className="h-3 w-24 bg-slate-100 rounded" />
            </div>
          </div>
          <div className="space-y-2 text-right shrink-0">
            <div className="h-5 w-24 bg-slate-200 rounded ml-auto" />
            <div className="h-3 w-16 bg-slate-100 rounded ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * DashboardSkeleton - Full Overview Dashboard Skeleton
 */
export function DashboardSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-pulse">
      {/* Hero Banner Skeleton */}
      <div className="bg-slate-900/90 rounded-2xl p-6 sm:p-8 border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-3 w-full max-w-lg">
          <div className="h-5 w-48 bg-slate-800 rounded-full" />
          <div className="h-8 w-3/4 bg-slate-800 rounded-xl" />
          <div className="h-4 w-full bg-slate-800/60 rounded" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="h-10 w-full sm:w-32 bg-slate-800 rounded-xl" />
          <div className="h-10 w-full sm:w-32 bg-slate-800 rounded-xl" />
        </div>
      </div>

      {/* 4 Summary Cards */}
      <CardSkeleton count={4} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartSkeleton type="bar" className="lg:col-span-2 h-80" />
        <ChartSkeleton type="donut" className="h-80" />
      </div>

      {/* Table Skeleton */}
      <TableSkeleton rows={4} columns={5} />
    </div>
  );
}

export default {
  CardSkeleton,
  ChartSkeleton,
  TableSkeleton,
  ListSkeleton,
  DashboardSkeleton,
};
