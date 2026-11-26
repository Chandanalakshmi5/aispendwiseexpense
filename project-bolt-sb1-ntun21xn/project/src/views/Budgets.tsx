import { useMemo, useState, useEffect } from 'react';
import { Plus, Trash2, X, Target, PiggyBank } from 'lucide-react';
import { supabase, CATEGORIES, CATEGORY_COLORS, type Expense, type Budget } from '@/lib/supabase';
import {
  getBudgetStatuses, recommendBudgets, formatINR, currentMonthKey, monthLabel,
} from '@/lib/analytics';
import { ProgressBar } from '@/components/Charts';

type Props = {
  expenses: Expense[];
  budgets: Budget[];
  onChange: () => void;
};

export default function Budgets({ expenses, budgets, onChange }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [showRecs, setShowRecs] = useState(false);
  const statuses = useMemo(
    () => getBudgetStatuses(expenses, budgets, currentMonthKey()),
    [expenses, budgets]
  );
  const recommendations = useMemo(
    () => recommendBudgets(expenses, budgets),
    [expenses, budgets]
  );

  const totalBudget = statuses.reduce((s, b) => s + b.budget, 0);
  const totalSpent = statuses.reduce((s, b) => s + b.spent, 0);
  const totalRemaining = totalBudget - totalSpent;

  async function handleDelete(category: string) {
    const { error } = await supabase.from('budgets').delete().eq('category', category);
    if (error) {
      alert('Failed to delete budget. Please try again.');
      return;
    }
    onChange();
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Budgets</h1>
          <p className="text-sm text-slate-400 mt-1">
            {monthLabel(currentMonthKey())} · Track your spending limits
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRecs(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-400/10 border border-violet-400/30 text-violet-300 hover:bg-violet-400/20 text-sm font-medium"
          >
            <PiggyBank size={16} />
            AI Recommendations
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-400 text-slate-900 hover:bg-teal-300 text-sm font-semibold shadow-lg shadow-teal-400/20"
          >
            <Plus size={16} />
            Set Budget
          </button>
        </div>
      </div>

      {/* Summary */}
      {statuses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card rounded-2xl p-5">
            <div className="text-xs text-slate-400 mb-1">Total Budget</div>
            <div className="text-2xl font-bold text-white font-display">{formatINR(totalBudget)}</div>
          </div>
          <div className="glass-card rounded-2xl p-5">
            <div className="text-xs text-slate-400 mb-1">Spent So Far</div>
            <div className="text-2xl font-bold text-amber-300 font-display">{formatINR(totalSpent)}</div>
            <div className="mt-2">
              <ProgressBar
                percent={totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0}
                color={totalSpent / totalBudget > 0.85 ? '#fbbf24' : '#38bdf8'}
              />
            </div>
          </div>
          <div className="glass-card rounded-2xl p-5">
            <div className="text-xs text-slate-400 mb-1">Remaining</div>
            <div className={`text-2xl font-bold font-display ${totalRemaining >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
              {formatINR(totalRemaining)}
            </div>
          </div>
        </div>
      )}

      {/* Budget cards */}
      {statuses.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Target size={40} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">No budgets set yet.</p>
          <p className="text-sm text-slate-500">
            Set monthly spending limits for each category to get alerts when you're approaching your limit.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {statuses.map((s, i) => {
            const color = CATEGORY_COLORS[s.category] || '#94a3b8';
            const barColor = s.status === 'over' ? '#f87171' : s.status === 'warning' ? '#fbbf24' : color;
            return (
              <div
                key={s.category}
                className="glass-card glass-card-hover rounded-2xl p-5 animate-fade-in-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${color}1a`, border: `1px solid ${color}33` }}
                    >
                      <div className="w-4 h-4 rounded-full" style={{ background: color }} />
                    </div>
                    <div>
                      <div className="text-white font-medium">{s.category}</div>
                      <div className="text-xs text-slate-500">
                        {formatINR(s.spent)} of {formatINR(s.budget)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                        s.status === 'over'
                          ? 'text-rose-300 bg-rose-500/10'
                          : s.status === 'warning'
                          ? 'text-amber-300 bg-amber-500/10'
                          : s.status === 'on-track'
                          ? 'text-sky-300 bg-sky-500/10'
                          : 'text-emerald-300 bg-emerald-500/10'
                      }`}
                    >
                      {s.status === 'over' ? 'Over Budget' : s.status === 'warning' ? 'Warning' : s.status === 'on-track' ? 'On Track' : 'Under'}
                    </span>
                    <button
                      onClick={() => handleDelete(s.category)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <ProgressBar percent={s.percentUsed} color={barColor} height={10} />
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="text-slate-500">{s.percentUsed.toFixed(0)}% used</span>
                  <span className={s.remaining >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {s.remaining >= 0 ? `${formatINR(s.remaining)} left` : `${formatINR(Math.abs(s.remaining))} over`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Budget form */}
      {showForm && (
        <BudgetForm
          existingBudgets={budgets}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            onChange();
          }}
        />
      )}

      {/* AI recommendations modal */}
      {showRecs && (
        <RecommendationsModal
          recommendations={recommendations}
          onClose={() => setShowRecs(false)}
          onApply={async (cat, limit) => {
            // Upsert budget
            const existing = budgets.find((b) => b.category === cat);
            if (existing) {
              await supabase.from('budgets').update({ monthly_limit: limit }).eq('category', cat);
            } else {
              await supabase.from('budgets').insert({ category: cat, monthly_limit: limit });
            }
            onChange();
          }}
        />
      )}
    </div>
  );
}

function BudgetForm({
  existingBudgets, onClose, onSaved,
}: {
  existingBudgets: Budget[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const existingCats = new Set(existingBudgets.map((b) => b.category));
  const available = CATEGORIES.filter((c) => !existingCats.has(c));
  const [category, setCategory] = useState(available[0] || CATEGORIES[0]);
  const [limit, setLimit] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const lmt = Number(limit);
    if (!lmt || lmt <= 0) {
      setError('Please enter a valid budget amount.');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('budgets')
      .insert({ category, monthly_limit: lmt });
    setSaving(false);
    if (error) {
      setError('Failed to save budget. Please try again.');
      return;
    }
    onSaved();
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="glass-card rounded-2xl p-6 w-full max-w-md animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-bold text-white">Set Monthly Budget</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
            <X size={18} />
          </button>
        </div>
        {available.length === 0 ? (
          <p className="text-slate-400 text-center py-4">
            You've set budgets for all categories. Delete one to add a new budget here.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {available.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      category === c
                        ? 'border-teal-400/50 bg-teal-400/15 text-teal-200'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Monthly Limit (₹)</label>
              <input
                type="number"
                step="100"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                placeholder="e.g. 5000"
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg placeholder-slate-600 outline-none focus:border-teal-400/50"
              />
            </div>
            {error && (
              <div className="text-rose-300 text-sm bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl bg-teal-400 text-slate-900 font-semibold hover:bg-teal-300 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Set Budget'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function RecommendationsModal({
  recommendations, onClose, onApply,
}: {
  recommendations: ReturnType<typeof recommendBudgets>;
  onClose: () => void;
  onApply: (category: string, limit: number) => Promise<void>;
}) {
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  async function apply(rec: { category: string; suggestedLimit: number }) {
    setApplying(rec.category);
    await onApply(rec.category, rec.suggestedLimit);
    setApplying(null);
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="glass-card rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5 sticky top-0 bg-slate-900/80 backdrop-blur-sm pb-3 -mt-6 pt-6 -mx-6 px-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-400/15 border border-violet-400/30 flex items-center justify-center">
              <PiggyBank size={18} className="text-violet-300" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-white">AI Budget Recommendations</h2>
              <p className="text-xs text-slate-400">Based on your last 3 months of spending</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        {recommendations.length === 0 ? (
          <p className="text-slate-400 text-center py-8">
            I need at least a month of expense data to generate recommendations. Start logging expenses!
          </p>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec, i) => {
              const color = CATEGORY_COLORS[rec.category] || '#94a3b8';
              const hasBudget = rec.currentBudget !== undefined;
              return (
                <div key={rec.category} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ background: `${color}1a`, border: `1px solid ${color}33` }}
                      >
                        <div className="w-3.5 h-3.5 rounded-full" style={{ background: color }} />
                      </div>
                      <div>
                        <div className="text-white font-medium text-sm">{rec.category}</div>
                        <div className="text-xs text-slate-500">
                          3-mo avg: {formatINR(rec.last3MonthAverage)} · Last month: {formatINR(rec.lastMonthSpend)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">{formatINR(rec.suggestedLimit)}</div>
                      <div className="text-xs text-slate-500">suggested/mo</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2 text-xs">
                    <span
                      className={`px-2 py-0.5 rounded-full font-medium ${
                        rec.trendDirection === 'up'
                          ? 'text-rose-300 bg-rose-500/10'
                          : rec.trendDirection === 'down'
                          ? 'text-emerald-300 bg-emerald-500/10'
                          : 'text-slate-400 bg-white/5'
                      }`}
                    >
                      {rec.trendDirection === 'up' ? '↑' : rec.trendDirection === 'down' ? '↓' : '→'} {rec.trendPercent.toFixed(0)}%
                    </span>
                    <span className="text-slate-400">
                      {hasBudget ? `Current: ${formatINR(rec.currentBudget!)}` : 'No budget set'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mb-3">{rec.reason}</p>
                  <button
                    onClick={() => apply(rec)}
                    disabled={applying === rec.category}
                    className="w-full py-2 rounded-lg bg-violet-400/15 border border-violet-400/30 text-violet-200 hover:bg-violet-400/25 text-sm font-medium disabled:opacity-50"
                  >
                    {applying === rec.category ? 'Applying...' : hasBudget ? 'Update Budget' : 'Apply This Budget'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
