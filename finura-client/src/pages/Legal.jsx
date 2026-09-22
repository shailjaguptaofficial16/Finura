import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const content = {
  privacy: {
    title: 'Privacy Policy',
    intro: 'Finura uses the information you provide to operate your account, show your financial workspace, and improve reliability.',
    sections: [
      ['What we collect', 'Account identity, preferences, financial records you choose to enter, and technical information needed to keep the service secure.'],
      ['How we use it', 'We use this information to provide dashboards, analytics, exports, alerts, and support. We do not sell personal financial information.'],
      ['Your choices', 'You can update your profile, export your records, or contact support about access and deletion requests.'],
    ],
  },
  terms: {
    title: 'Terms of Service',
    intro: 'Finura is a personal finance organization tool. It is not a bank, broker, lender, or substitute for professional financial advice.',
    sections: [
      ['Use of the service', 'Keep your login secure, provide accurate information, and use the product only for lawful personal or business planning.'],
      ['Financial information', 'Dashboards and AI insights are informational. Confirm important decisions with a qualified professional and the underlying institution.'],
      ['Availability', 'We work to keep Finura dependable, but maintenance, integrations, and third-party services may occasionally be unavailable.'],
    ],
  },
};

export default function Legal() {
  const key = useLocation().pathname.includes('privacy') ? 'privacy' : 'terms';
  const page = content[key];
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16 sm:px-6">
      <article className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
        <Link to="/" className="text-sm font-bold text-teal-700 hover:text-teal-900">Finura</Link>
        <h1 className="mt-8 text-4xl font-extrabold tracking-tight text-slate-900">{page.title}</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">{page.intro}</p>
        <div className="mt-10 space-y-8">
          {page.sections.map(([heading, text]) => <section key={heading}><h2 className="text-xl font-bold text-slate-900">{heading}</h2><p className="mt-2 leading-7 text-slate-600">{text}</p></section>)}
        </div>
        <p className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-500">Questions? <a className="font-semibold text-teal-700" href="mailto:support@finura.app">Contact support</a>.</p>
      </article>
    </main>
  );
}
