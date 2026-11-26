import { useEffect, useState, useCallback } from 'react';
import {
  LayoutDashboard, Receipt, Target, Sparkles, MessageSquare, Wallet,
} from 'lucide-react';
import { supabase, type Expense, type Budget } from '@/lib/supabase';
import Dashboard from '@/views/Dashboard';
import Expenses from '@/views/Expenses';
import Budgets from '@/views/Budgets';
import Insights from '@/views/Insights';
import Chatbot from '@/views/Chatbot';

type View = 'dashboard' | 'expenses' | 'budgets' | 'insights' | 'chatbot';

const NAV_ITEMS: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'budgets', label: 'Budgets', icon: Target },
  { id: 'insights', label: 'AI Insights', icon: Sparkles },
  { id: 'chatbot', label: 'Ask AI', icon: MessageSquare },
];

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const loadData = useCallback(async () => {
    const [{ data: expData, error: expErr }, { data: budData, error: budErr }] = await Promise.all([
      supabase.from('expenses').select('*').order('date', { ascending: false }),
      supabase.from('budgets').select('*').order('category', { ascending: true }),
    ]);
    if (expErr || budErr) {
      console.error('Error loading data:', expErr || budErr);
    }
    setExpenses((expData as Expense[]) || []);
    setBudgets((budData as Budget[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleNavigate = (v: string) => {
    setView(v as View);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="min-h-screen bg-[#fbf8f4] text-slate-200">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-[120px]"
          style={{ background: 'radial-gradient(circle, #38bdf8, transparent)' }}
        />
        <div
          className="absolute top-1/2 -left-40 w-96 h-96 rounded-full opacity-15 blur-[120px]"
          style={{ background: 'radial-gradient(circle, #5eead4, transparent)' }}
        />
      </div>

      {/* Sidebar — Desktop */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col border-r border-white/8 bg-white/80 backdrop-blur-xl z-40">
        <SidebarContent
          view={view}
          onNavigate={handleNavigate}
        />
      </aside>

      {/* Mobile nav */}
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 flex flex-col border-r border-white/8 bg-white animate-slide-in-right">
            <SidebarContent view={view} onNavigate={handleNavigate} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-white/8 bg-[#fbf8f4]/90 backdrop-blur-xl">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="flex items-center gap-2 text-white"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-sky-500 flex items-center justify-center">
              <Wallet size={16} className="text-slate-900" />
            </div>
            <span className="font-display font-bold">SpendWise AI</span>
          </button>
          <button
            onClick={() => setMobileNavOpen(true)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto relative z-10">
          {loading ? (
            <LoadingState />
          ) : (
            <>
              {view === 'dashboard' && (
                <Dashboard expenses={expenses} budgets={budgets} onNavigate={handleNavigate} />
              )}
              {view === 'expenses' && (
                <Expenses expenses={expenses} onChange={loadData} />
              )}
              {view === 'budgets' && (
                <Budgets expenses={expenses} budgets={budgets} onChange={loadData} />
              )}
              {view === 'insights' && (
                <Insights expenses={expenses} budgets={budgets} onNavigate={handleNavigate} />
              )}
              {view === 'chatbot' && (
                <Chatbot expenses={expenses} budgets={budgets} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  view,
  onNavigate,
}: {
  view: string;
  onNavigate: (v: string) => void;
}) {
  return (
    <>
      {/* Logo */}
      <div className="px-6 py-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-sky-500 flex items-center justify-center shadow-lg shadow-teal-400/20">
          <Wallet size={20} className="text-slate-900" />
        </div>
        <div>
          <div className="font-display font-bold text-white text-lg leading-none">SpendWise</div>
          <div className="text-xs text-teal-300 mt-0.5 font-medium">AI Expense Manager</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-gradient-to-r from-teal-400/15 to-sky-400/5 text-teal-200 border border-teal-400/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon size={18} className={active ? 'text-teal-300' : ''} />
              {item.label}
              {item.id === 'chatbot' && (
                <span className="ml-auto">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400" />
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/8">
        <div className="bg-gradient-to-br from-teal-400/10 to-sky-400/5 border border-teal-400/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-teal-300" />
            <span className="text-xs font-semibold text-teal-200">AI-Powered Insights</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Forecast spending, detect anomalies, and get personalized budget recommendations.
          </p>
        </div>
      </div>
    </>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-48 shimmer rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 shimmer rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="h-64 shimmer rounded-2xl lg:col-span-2" />
        <div className="h-64 shimmer rounded-2xl" />
      </div>
    </div>
  );
}
