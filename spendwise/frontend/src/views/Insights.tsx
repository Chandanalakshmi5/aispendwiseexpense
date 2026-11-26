import { useMemo, useState } from 'react';
import {
  TrendingUp, AlertTriangle, Brain, Lightbulb, Target, Zap, Activity,
} from 'lucide-react';
import type { Expense, Budget } from '@/lib/supabase';
import {
  forecastMonthly, detectAnomalies, getMonthlySummaries, formatINR,
  currentMonthKey, monthLabel, formatDate, recommendBudgets, forecastShortTerm,
} from '@/lib/analytics';
import { LineChart, ProgressBar } from '@/components/Charts';

type Props = {
  expenses: Expense[];
  budgets: Budget[];
  onNavigate: (view: string) => void;
};

export default function Insights({ expenses, budgets, onNavigate }: Props) {
  const forecast = useMemo(() => forecastMonthly(expenses), [expenses]);
  const anomalies = useMemo(() => detectAnomalies(expenses), [expenses]);
  const summaries = useMemo(() => getMonthlySummaries(expenses), [expenses]);
  const recs = useMemo(() => recommendBudgets(expenses, budgets), [expenses, budgets]);
  const sevenDayForecast = useMemo(() => forecastShortTerm(expenses, 7), [expenses]);
  const thirtyDayForecast = useMemo(() => forecastShortTerm(expenses, 30), [expenses]);

  const currentM = currentMonthKey();
  const monthAnomalies = anomalies.filter((a) => {
    const d = new Date(a.expense.date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === currentM;
  });

  const forecastLineData = summaries.map((s) => ({
    label: s.label.split(' ')[0],
    value: s.total,
  }));
  // Add forecast point
  forecastLineData.push({
    label: 'Forecast',
    value: forecast.predictedTotal,
  });

  const overBudget = forecast.predictedTotal > summaries.slice(-2, -1)[0]?.total * 1.1;

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-white">AI Insights</h1>
        <p className="text-sm text-slate-400 mt-1">
          Machine learning predictions and analysis of your spending patterns
        </p>
      </div>

      {/* Monthly Forecast */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-sky-400/15 border border-sky-400/30 flex items-center justify-center">
            <Brain size={20} className="text-sky-300" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-white">Monthly Expense Forecast</h2>
            <p className="text-xs text-slate-400">{forecast.method}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                forecast.confidence === 'high'
                  ? 'text-emerald-300 bg-emerald-500/10'
                  : forecast.confidence === 'medium'
                  ? 'text-amber-300 bg-amber-500/10'
                  : 'text-slate-400 bg-white/5'
              }`}
            >
              {forecast.confidence} confidence
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Forecast numbers */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-sky-400/10 to-teal-400/5 border border-sky-400/20 rounded-xl p-5">
              <div className="text-xs text-slate-400 mb-1">Projected Month-End Spend</div>
              <div className="text-4xl font-bold gradient-text font-display">
                {formatINR(forecast.predictedTotal)}
              </div>
              <div className="flex items-center gap-4 mt-4 text-sm">
                <div>
                  <span className="text-slate-500">Spent so far: </span>
                  <span className="text-white font-medium">{formatINR(forecast.spentSoFar)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Days left: </span>
                  <span className="text-white font-medium">{forecast.daysRemaining}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-xs text-slate-400 mb-1">Projected Daily Avg</div>
                <div className="text-lg font-semibold text-white">{formatINR(forecast.projectedDailyAverage)}</div>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-xs text-slate-400 mb-1">Historical Monthly Avg</div>
                <div className="text-lg font-semibold text-white">{formatINR(forecast.historicalMonthlyAverage)}</div>
              </div>
            </div>

            {overBudget && budgets.length > 0 && (
              <div className="flex items-start gap-2 text-sm text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>
                  At this pace, you're projected to exceed last month's spending. Consider reviewing your discretionary expenses.
                </span>
              </div>
            )}
          </div>

          {/* Forecast chart */}
          <div>
            <div className="text-xs text-slate-400 mb-3">Historical + Forecast Trend</div>
            {forecastLineData.length > 1 ? (
              <LineChart
                data={forecastLineData}
                height={240}
                color="#38bdf8"
                formatValue={(v) => formatINR(v)}
              />
            ) : (
              <div className="flex items-center justify-center h-60 text-sm text-slate-500">
                Add at least one month of expenses to see forecasts.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 7-day / 30-day forecasts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[sevenDayForecast, thirtyDayForecast].map((item) => (
          <div key={item.horizon} className="glass-card rounded-2xl p-5 border border-violet-400/10">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-white">{item.horizon}-Day Spend Forecast</p>
                <p className="text-xs text-slate-500 mt-1">Rolling feature forecast</p>
              </div>
              <Activity size={18} className="text-violet-300" />
            </div>
            <div className="text-3xl font-bold text-violet-300 font-display">{formatINR(item.predictedSpend)}</div>
            <div className="mt-2 text-xs text-slate-400">
              Approx. {formatINR(item.dailyAverage)} per day
            </div>
          </div>
        ))}
      </div>

      {/* Anomaly Detection */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center">
            <Zap size={20} className="text-amber-300" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-white">Unusual Expense Detection</h2>
            <p className="text-xs text-slate-400">Isolation-forest-style outlier detection · {monthLabel(currentM)}</p>
          </div>
          <div className="ml-auto">
            <span className="text-3xl font-bold text-amber-300 font-display">{monthAnomalies.length}</span>
          </div>
        </div>

        {monthAnomalies.length === 0 ? (
          <div className="flex items-center gap-3 text-sm text-slate-400 bg-white/5 rounded-xl p-4">
            <Activity size={16} className="text-emerald-400" />
            <span>No unusual transactions detected this month. Your spending looks consistent with your normal patterns.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {monthAnomalies.map((a, i) => (
              <div
                key={a.expense.id}
                className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-4 animate-fade-in-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: a.severity === 'extreme' ? '#f871711a' : a.severity === 'moderate' ? '#fbbf241a' : '#fbbf2410',
                    border: `1px solid ${a.severity === 'extreme' ? '#f8717133' : '#fbbf2433'}`,
                  }}
                >
                  <AlertTriangle
                    size={18}
                    className={a.severity === 'extreme' ? 'text-rose-400' : 'text-amber-300'}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-white font-medium">{a.category}</span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        a.severity === 'extreme'
                          ? 'text-rose-300 bg-rose-500/10'
                          : a.severity === 'moderate'
                          ? 'text-amber-300 bg-amber-500/10'
                          : 'text-yellow-300 bg-yellow-500/10'
                      }`}
                    >
                      {a.severity}
                    </span>
                    <span className="text-xs text-slate-500">{formatDate(a.expense.date)}</span>
                  </div>
                  <div className="text-lg font-semibold text-white mb-1">{formatINR(a.amount)}</div>
                  <p className="text-sm text-slate-400">{a.reason}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                    <span>Typical: {formatINR(a.categoryMean)}</span>
                    <span>Z-score: {a.zScore.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Budget Recommendations preview */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-violet-400/15 border border-violet-400/30 flex items-center justify-center">
            <Lightbulb size={20} className="text-violet-300" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-white">Personalized Recommendations</h2>
            <p className="text-xs text-slate-400">Clustering + statistical analysis of your spending trends</p>
          </div>
        </div>

        {recs.length === 0 ? (
          <div className="flex items-center gap-3 text-sm text-slate-400 bg-white/5 rounded-xl p-4">
            <Target size={16} className="text-slate-500" />
            <span>I need at least a month of expense data to generate recommendations. Keep logging expenses!</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recs.slice(0, 4).map((rec) => (
              <div key={rec.category} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium text-sm">{rec.category}</span>
                  <span className="text-lg font-bold text-violet-300">{formatINR(rec.suggestedLimit)}</span>
                </div>
                <p className="text-xs text-slate-400">{rec.reason}</p>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={() => onNavigate('budgets')}
          className="mt-4 flex items-center gap-2 text-sm text-violet-300 hover:text-violet-200 font-medium"
        >
          <TrendingUp size={14} />
          Manage all budgets →
        </button>
      </div>
    </div>
  );
}
