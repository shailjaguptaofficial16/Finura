import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Target,
  Bot,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const ONBOARDING_STEPS = [
  {
    id: 1,
    title: 'Welcome to Finura',
    subtitle: 'Welcome to Finura. Let’s set up your financial workspace.',
    description:
      'Gain total clarity over your financial health. We will guide you through setting up your accounts, recording income and expenses, establishing budgets, and discovering AI-driven insights.',
    icon: Sparkles,
    badge: 'Step 1: Introduction',
    buttonText: 'Get Started',
    route: null,
    tip: 'Takes less than 2 minutes to configure.'
  },
  {
    id: 2,
    title: 'Add Your First Account',
    subtitle: 'Add a bank, cash or credit account to begin tracking your money.',
    description:
      'Connect checking, savings, cash balances, or credit accounts to establish your baseline ledger and track real-time liquidity.',
    icon: Wallet,
    badge: 'Step 2: Accounts',
    buttonText: 'Open Accounts Page',
    route: '/dashboard/money/accounts',
    tip: 'Tip: You can add multiple accounts and choose your primary currency.'
  },
  {
    id: 3,
    title: 'Record Your Income',
    subtitle: 'Record your salary, freelance income or other earnings.',
    description:
      'Log recurring salary or incoming client revenue to benchmark your monthly cash inflow and establish surplus potential.',
    icon: ArrowUpRight,
    badge: 'Step 3: Income',
    buttonText: 'Record Income',
    route: '/dashboard/money/transactions',
    tip: 'Tip: Marking transactions as Income automatically updates your net cashflow.'
  },
  {
    id: 4,
    title: 'Add Your Expenses',
    subtitle: 'Track your spending to understand where your money goes.',
    description:
      'Track outflows like rent, groceries, utility bills, and entertainment. Categorization helps uncover hidden spending leaks.',
    icon: ArrowDownRight,
    badge: 'Step 4: Expenses',
    buttonText: 'Add Expense',
    route: '/dashboard/money/transactions',
    tip: 'Tip: Categorizing expenses activates smart budget alerts.'
  },
  {
    id: 5,
    title: 'Set a Monthly Budget',
    subtitle: 'Set a monthly budget to keep category spending under control.',
    description:
      'Establish spending limits for key categories like Food, Transport, and Leisure. Finura will monitor velocity and alert you before you exceed limits.',
    icon: PieChart,
    badge: 'Step 5: Budgets',
    buttonText: 'Set Up Budgets',
    route: '/dashboard/money/budgets',
    tip: 'Tip: Staying within budget increases your monthly savings rate.'
  },
  {
    id: 6,
    title: 'Create a Financial Goal',
    subtitle: 'Create a savings or financial goal and monitor your progress.',
    description:
      'Define targets for an emergency fund, home deposit, debt payoff, or holiday. Track real-time progress toward your target dates.',
    icon: Target,
    badge: 'Step 6: Goals',
    buttonText: 'Create a Goal',
    route: '/dashboard/planning/goals',
    tip: 'Tip: Small regular contributions compound rapidly into large milestones.'
  },
  {
    id: 7,
    title: 'Explore Finura AI',
    subtitle: 'Ask Finura AI for spending insights and personalized suggestions.',
    description:
      'Finura AI continuously analyzes your spending velocity, flags unusual charges, and offers intelligent surplus optimization advice.',
    icon: Bot,
    badge: 'Step 7: AI Intelligence',
    buttonText: 'Open AI Assistant',
    route: '/dashboard/ai/assistant',
    tip: 'Tip: Try asking "How can I increase my monthly savings rate by 10%?"'
  }
];

export default function OnboardingModal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const modalRef = useRef(null);

  const userKey = user?._id || user?.id || user?.email || 'default_user';
  const storageKey = `finura_onboarding_${userKey}`;

  // Check if user needs onboarding on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      const isNewUserFlag = localStorage.getItem('finura_is_new_user');

      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.completed && !parsed.skipped) {
          setCurrentStepIndex(parsed.currentStep ? parsed.currentStep - 1 : 0);
          setIsOpen(true);
        }
      } else if (isNewUserFlag === 'true') {
        // First login of new user
        setIsOpen(true);
        setCurrentStepIndex(0);
      }
    } catch (e) {
      console.warn('Error reading onboarding status:', e);
    }
  }, [storageKey]);

  // Listen for restart onboarding event from Settings
  useEffect(() => {
    const handleRestart = () => {
      setCurrentStepIndex(0);
      setIsOpen(true);
      try {
        localStorage.setItem(storageKey, JSON.stringify({ completed: false, skipped: false, currentStep: 1 }));
        localStorage.setItem('finura_is_new_user', 'true');
      } catch (e) {
        console.warn('Error saving restart state:', e);
      }
    };

    window.addEventListener('finura:restart-onboarding', handleRestart);
    return () => window.removeEventListener('finura:restart-onboarding', handleRestart);
  }, [storageKey]);

  // Keyboard accessibility
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight' && currentStepIndex < ONBOARDING_STEPS.length - 1) {
        handleNext();
      } else if (e.key === 'ArrowLeft' && currentStepIndex > 0) {
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex]);

  const saveProgress = (stepIdx, isCompleted = false, isSkipped = false) => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          completed: isCompleted,
          skipped: isSkipped,
          currentStep: stepIdx + 1,
          updatedAt: new Date().toISOString()
        })
      );
      if (isCompleted || isSkipped) {
        localStorage.removeItem('finura_is_new_user');
      }
    } catch (e) {
      console.warn('Error saving onboarding progress:', e);
    }
  };

  const handleNext = () => {
    if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      saveProgress(nextIdx);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      saveProgress(prevIdx);
    }
  };

  const handleAction = () => {
    const step = ONBOARDING_STEPS[currentStepIndex];
    if (step.route) {
      navigate(step.route);
    }

    if (currentStepIndex === ONBOARDING_STEPS.length - 1) {
      handleComplete();
    } else {
      handleNext();
    }
  };

  const handleSkip = () => {
    saveProgress(currentStepIndex, true, true);
    setIsOpen(false);
    toast.info('Onboarding skipped. You can restart it anytime from Settings.');
  };

  const handleComplete = () => {
    saveProgress(ONBOARDING_STEPS.length - 1, true, false);
    setIsOpen(false);
    toast.success('Congratulations! Your Finura financial workspace is all set.');
  };

  if (!isOpen) return null;

  const step = ONBOARDING_STEPS[currentStepIndex];
  const IconComp = step.icon;
  const progressPercent = Math.round(((currentStepIndex + 1) / ONBOARDING_STEPS.length) * 100);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === ONBOARDING_STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-step-title"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
              <Sparkles size={12} />
              Getting Started
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Step {currentStepIndex + 1} of {ONBOARDING_STEPS.length}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors p-1 rounded-lg hover:bg-slate-200/50 flex items-center gap-1"
            aria-label="Skip onboarding"
          >
            <span>Skip tour</span>
            <X size={15} />
          </button>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5 overflow-hidden" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shadow-sm shrink-0">
              <IconComp size={28} />
            </div>
            <div>
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wider block mb-1">
                {step.badge}
              </span>
              <h2 id="onboarding-step-title" className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {step.title}
              </h2>
            </div>
          </div>

          <p className="text-base font-semibold text-slate-700 mb-2">
            {step.subtitle}
          </p>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            {step.description}
          </p>

          {/* Contextual Tip Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-6 text-xs text-slate-600 flex items-center gap-2.5">
            <CheckCircle2 size={16} className="text-teal-600 shrink-0" />
            <span>{step.tip}</span>
          </div>

          {/* Step Navigation Indicator Dots */}
          <div className="flex justify-center items-center gap-1.5 mb-6">
            {ONBOARDING_STEPS.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setCurrentStepIndex(idx);
                  saveProgress(idx);
                }}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentStepIndex
                    ? 'w-6 bg-teal-600'
                    : idx < currentStepIndex
                    ? 'w-2 bg-teal-300'
                    : 'w-2 bg-slate-200'
                }`}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 gap-3">
            <div>
              {!isFirstStep ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1"
                >
                  <ChevronLeft size={16} />
                  Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors px-2 py-1"
                >
                  Skip for now
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {step.route && (
                <button
                  type="button"
                  onClick={handleAction}
                  className="px-4 py-2.5 text-xs sm:text-sm font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors flex items-center gap-1"
                >
                  {step.buttonText}
                  <ChevronRight size={15} />
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <span>{isLastStep ? 'Complete Setup' : 'Continue'}</span>
                {!isLastStep ? <ChevronRight size={16} /> : <Check size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
