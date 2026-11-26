import { useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Wallet, AlertTriangle, Receipt, Sparkles,
} from 'lucide-react';
import type { Expense, Budget } from '@/lib/supabase';
import {
  getDashboardSummary, getMonthlySummaries, getCategoryBreakdown,
  getDailySeries, formatINR, currentMonthKey, monthLabel,
} from '@/lib/analytics';
import { BarChart, DonutChart, LineChart } from '@/components/Charts';

type Props = {
  expenses: Expense[];
  budgets: Budget[];
  onNavigate: (view: string) => void;
};

export default function Dashboard({ expenses, budgets, onNavigate }: Props) {
  const summary = useMemo(() => getDashboardSummary(expenses, budgets), [expenses, budgets]);
  const monthlyData = useMemo(() => getMonthlySummaries(expenses), [expenses]);
  const breakdown = useMemo(() => getCategoryBreakdown(expenses, currentMonthKey()), [expenses]);
  const dailySeries = useMemo(() => getDailySeries(expenses, currentMonthKey()), [expenses]);

  const stats = [
    {
      label: 'Spent This Month',
      value: formatINR(summary.totalThisMonth),
      sub: `${summary.monthOverMonthChange >= 0 ? '+' : ''}${summary.monthOverMonthChange.toFixed(1)}% vs last month`,
      icon: Wallet,
      color: '#38bdf8',
      trendUp: summary.monthOverMonthChange >= 0,
    },
    {
      label: 'Avg Daily Spend',
      value: formatINR(summary.avgDailySpend),
      sub: `Across ${summary.transactionCount} transactions`,
      icon: TrendingUp,
      color: '#5eead4',
    },
    {
      label: 'Top Category',
      value: summary.topCategory ? summary.topCategory.category : '—',
      sub: summary.topCategory ? formatINR(summary.topCategory.amount) : 'No data yet',
      icon: Sparkles,
      color: '#f472b6',
    },
    {
      label: 'Budget Alerts',
      value: summary.budgetAlerts.toString(),
      sub: `${summary.anomaliesCount} unusual transactions`,
      icon: AlertTriangle,
      color: summary.budgetAlerts > 0 ? '#fbbf24' : '#34d399',
    },
  ];

  const barData = monthlyData.slice(-6).map((m) => ({
    label: m.label.split(' ')[0],
    value: m.total,
    color: m.month === currentMonthKey() ? '#5eead4' : '#38bdf8',
  }));

  const donutData = breakdown.slice(0, 6).map((b) => ({
    label: b.category,
    value: b.total,
    color: b.color,
  }));

  const lineData = dailySeries.map((d) => ({
    label: new Date(d.date).getDate().toString(),
    value: d.amount,
  }));

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            {monthLabel(currentMonthKey())} · Your financial overview at a glance
          </p>
        </div>
        <button
          onClick={() => onNavigate('expenses')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-400/10 border border-teal-400/30 text-teal-300 hover:bg-teal-400/20 text-sm font-medium"
        >
          <Receipt size={16} />
          Add Expense
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={i}
              className="glass-card glass-card-hover rounded-2xl p-5 animate-fade-in-up"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${s.color}1a`, border: `1px solid ${s.color}33` }}
                >
                  <Icon size={18} style={{ color: s.color }} />
                </div>
                {s.trendUp !== undefined && (
                  <span
                    className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${
                      s.trendUp ? 'text-rose-300 bg-rose-500/10' : 'text-emerald-300 bg-emerald-500/10'
                    }`}
                  >
                    {s.trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {Math.abs(summary.monthOverMonthChange).toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-white font-display">{s.value}</div>
              <div className="text-xs text-slate-400 mt-1">{s.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly trend */}
        <div className="glass-card rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-white">Monthly Spending Trend</h3>
            <span className="text-xs text-slate-500">Last 6 months</span>
          </div>
          {barData.length > 0 ? (
            <BarChart
              data={barData}
              height={220}
              formatValue={(v) => formatINR(v)}
            />
          ) : (
            <EmptyChart text="No spending history yet. Add expenses to see trends." />
          )}
        </div>

        {/* Category donut */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-display font-semibold text-white mb-4">Spending by Category</h3>
          {donutData.length > 0 ? (
            <>
              <div className="flex justify-center mb-4">
                <DonutChart
                  data={donutData}
                  size={170}
                  centerLabel="Total"
                  centerValue={formatINR(summary.totalThisMonth)}
                />
              </div>
              <div className="space-y-2">
                {breakdown.slice(0, 5).map((b) => (
                  <div key={b.category} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: b.color }}
                      />
                      <span className="text-slate-300">{b.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{formatINR(b.total)}</span>
                      <span className="text-slate-500 text-xs w-10 text-right">{b.percentage.toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyChart text="No spending this month yet." />
          )}
        </div>
      </div>

      {/* Daily spending line */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-white">Daily Spending — This Month</h3>
          <span className="text-xs text-slate-500">{lineData.length} active days</span>
        </div>
        {lineData.length > 1 ? (
          <LineChart
            data={lineData}
            height={200}
            color="#5eead4"
            formatValue={(v) => formatINR(v)}
          />
        ) : (
          <EmptyChart text="Add a few expenses to see your daily spending pattern." />
        )}
      </div>
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-40 text-sm text-slate-500 text-center px-6">
      {text}
    </div>
  );
}
