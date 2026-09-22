import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react';

const steps = [
  ['Add your first account', '/dashboard/money/accounts'],
  ['Record your income', '/dashboard/money/transactions'],
  ['Add your expenses', '/dashboard/money/transactions'],
  ['Set a monthly budget', '/dashboard/money/budgets'],
  ['Create a financial goal', '/dashboard/planning/goals'],
  ['Explore your financial insights', '/dashboard/analytics/overview'],
];

export default function GettingStarted({ completed = {} }) {
  const completeCount = steps.filter(([label]) => completed[label]).length;
  return (
    <main className="min-h-full bg-slate-50 p-4 sm:p-6">
      <section className="mx-auto max-w-4xl overflow-hidden rounded-3xl bg-slate-900 text-white shadow-xl">
        <div className="p-7 sm:p-10">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-teal-300">Your first week with Finura</span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Welcome to Finura</h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-300">Build a complete picture of your money in a few focused steps. You can return here whenever you need a clear next action.</p>
          <div className="mt-7 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-teal-400 transition-all" style={{ width: `${(completeCount / steps.length) * 100}%` }} /></div>
          <p className="mt-2 text-sm text-slate-400">{completeCount} of {steps.length} steps complete</p>
        </div>
        <div className="grid gap-3 bg-white p-4 text-slate-900 sm:p-6">
          {steps.map(([label, path], index) => <Link key={label} to={path} className="group flex items-center gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-teal-300 hover:bg-teal-50"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">{completed[label] ? <CheckCircle2 className="text-teal-600" size={20} /> : <Circle size={19} />}</span><span className="flex-1"><strong className="block">{index + 1}. {label}</strong><span className="mt-1 block text-xs text-slate-500">Open the workspace and keep building your financial picture.</span></span><ArrowRight className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-teal-700" size={18} /></Link>)}
        </div>
      </section>
    </main>
  );
}
