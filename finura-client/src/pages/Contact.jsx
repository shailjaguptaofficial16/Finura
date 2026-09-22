import React from 'react';
import { Mail, MessageCircle, ArrowRight } from 'lucide-react';

export default function Contact() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16 sm:px-6">
      <section className="mx-auto max-w-5xl rounded-3xl bg-slate-900 p-8 text-white shadow-xl sm:p-12">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-teal-300">Finura Support</span>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">Let&apos;s make your money clearer.</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">Our support team can help with account setup, data questions, exports, and secure access.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <a href="mailto:support@finura.app" className="rounded-2xl border border-white/15 bg-white/10 p-5 transition hover:bg-white/15">
            <Mail className="text-teal-300" size={22} />
            <strong className="mt-4 block text-lg">Email support</strong>
            <span className="mt-1 block text-sm text-slate-300">support@finura.app</span>
          </a>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-5">
            <MessageCircle className="text-teal-300" size={22} />
            <strong className="mt-4 block text-lg">Response window</strong>
            <span className="mt-1 block text-sm text-slate-300">Usually within one business day.</span>
          </div>
        </div>
        <a href="/login" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-teal-300 hover:text-white">Open your Finura account <ArrowRight size={16} /></a>
      </section>
    </main>
  );
}
