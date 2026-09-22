import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Home, ArrowLeft } from 'lucide-react';
import FinuraLogo from '../components/FinuraLogo';


export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg bg-slate-800/80 border border-slate-700/80 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl text-center space-y-6 animate-fade-in">
        <div className="flex justify-center mb-2">
          <FinuraLogo inverse />
        </div>

        <div>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 mb-3">
            404 Error · Resource Missing
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-heading">
            Page Not Found
          </h1>
          <p className="text-sm text-slate-300 max-w-sm mx-auto mt-2 leading-relaxed">
            The destination you are attempting to reach does not exist or has been relocated within the Finura portal.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard/overview')}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            <LayoutDashboard size={16} />
            <span>Go to Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full sm:w-auto px-6 py-3 bg-slate-700/80 hover:bg-slate-700 text-slate-200 border border-slate-600/80 font-semibold text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            <Home size={16} />
            <span>Home Page</span>
          </button>
        </div>

        <div className="pt-4 border-t border-slate-700/60">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="text-xs text-teal-400 hover:text-teal-300 transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Return to previous view</span>
          </button>
        </div>
      </div>
    </div>
  );
}
