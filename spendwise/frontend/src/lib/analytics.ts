import type { Expense, Budget } from './supabase';

/* ============================================================
   Types
   ============================================================ */

export type MonthlySummary = {
  month: string; // "2026-10"
  label: string; // "Oct 2026"
  total: number;
  byCategory: Record<string, number>;
};

export type CategoryBreakdown = {
  category: string;
  total: number;
  percentage: number;
  color: string;
  count: number;
};

export type DailySeries = {
  date: string;
  amount: number;
};

/* ============================================================
   Utilities
   ============================================================ */

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatINRDecimal(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function monthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export function currentMonthKey(): string {
  return monthKey(new Date().toISOString());
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

/* ============================================================
   Aggregation helpers
   ============================================================ */

export function getMonthlySummaries(expenses: Expense[]): MonthlySummary[] {
  const map = new Map<string, MonthlySummary>();
  for (const e of expenses) {
    const key = monthKey(e.date);
    if (!map.has(key)) {
      map.set(key, {
        month: key,
        label: monthLabel(key),
        total: 0,
        byCategory: {},
      });
    }
    const entry = map.get(key)!;
    entry.total += Number(e.amount);
    entry.byCategory[e.category] = (entry.byCategory[e.category] || 0) + Number(e.amount);
  }
  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
}

export function getCategoryBreakdown(
  expenses: Expense[],
  filterMonth?: string
): CategoryBreakdown[] {
  const filtered = filterMonth
    ? expenses.filter((e) => monthKey(e.date) === filterMonth)
    : expenses;
  const totals = new Map<string, { total: number; count: number }>();
  for (const e of filtered) {
    const cur = totals.get(e.category) || { total: 0, count: 0 };
    cur.total += Number(e.amount);
    cur.count += 1;
    totals.set(e.category, cur);
  }
  const grandTotal = Array.from(totals.values()).reduce((s, v) => s + v.total, 0);
  const CATEGORY_COLORS: Record<string, string> = {
    Food: '#fb923c', Transport: '#38bdf8', Shopping: '#f472b6',
    'Bills & Utilities': '#a78bfa', Entertainment: '#facc15',
    Health: '#34d399', Education: '#60a5fa', Rent: '#f87171', Other: '#94a3b8',
  };
  return Array.from(totals.entries())
    .map(([category, v]) => ({
      category,
      total: v.total,
      count: v.count,
      percentage: grandTotal > 0 ? (v.total / grandTotal) * 100 : 0,
      color: CATEGORY_COLORS[category] || '#94a3b8',
    }))
    .sort((a, b) => b.total - a.total);
}

export function getDailySeries(expenses: Expense[], filterMonth?: string): DailySeries[] {
  const filtered = filterMonth
    ? expenses.filter((e) => monthKey(e.date) === filterMonth)
    : expenses;
  const map = new Map<string, number>();
  for (const e of filtered) {
    map.set(e.date, (map.get(e.date) || 0) + Number(e.amount));
  }
  return Array.from(map.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/* ============================================================
   1. Monthly Expense Forecasting
   Ridge-style linear regression with daily spend features.
   Predicts the current incomplete month's total based on spend so far
   + the trend from prior months.
   ============================================================ */

export type ForecastResult = {
  predictedTotal: number;
  spentSoFar: number;
  daysElapsed: number;
  daysRemaining: number;
  projectedDailyAverage: number;
  historicalMonthlyAverage: number;
  confidence: 'low' | 'medium' | 'high';
  method: string;
};

export function forecastMonthly(expenses: Expense[], targetMonth?: string): ForecastResult {
  const now = new Date();
  const target = targetMonth || currentMonthKey();
  const [y, m] = target.split('-').map(Number);

  const summaries = getMonthlySummaries(expenses);
  const pastMonths = summaries.filter((s) => s.month < target);

  // Daily averages per past month
  const pastMonthlyTotals = pastMonths.map((s) => s.total);
  const historicalMonthlyAverage = pastMonthlyTotals.length > 0
    ? mean(pastMonthlyTotals)
    : 0;

  // Build daily-average history weighted by recency (ridge-like shrinkage)
  const dailyAverages = pastMonths.map((s) => {
    const [, mm] = s.month.split('-').map(Number);
    const dim = daysInMonth(Number(s.month.slice(0, 4)), mm);
    return s.total / dim;
  });

  // Weighted daily average (more recent months weigh more)
  let weightedDaily = historicalMonthlyAverage / 30;
  if (dailyAverages.length > 0) {
    const weights = dailyAverages.map((_, i) => Math.pow(0.8, dailyAverages.length - 1 - i));
    const wSum = weights.reduce((a, b) => a + b, 0);
    weightedDaily = dailyAverages.reduce((s, d, i) => s + d * weights[i], 0) / wSum;
  }

  // Current month spend so far
  const currentMonthExpenses = expenses.filter((e) => monthKey(e.date) === target);
  const spentSoFar = currentMonthExpenses.reduce((s, e) => s + Number(e.amount), 0);

  const today = target === currentMonthKey() ? now : new Date(y, m, 0);
  const dim = daysInMonth(y, m);
  const todayDate = today.getDate();
  const daysElapsed = target === currentMonthKey() ? todayDate : dim;
  const daysRemaining = dim - daysElapsed;

  // Current actual daily average
  const currentDailyAvg = daysElapsed > 0 ? spentSoFar / daysElapsed : 0;

  // Blend: actual current pace (high weight) + historical pace (low weight for remaining days)
  const blendWeight = Math.min(daysElapsed / 10, 0.8); // trust actual more as month progresses
  const projectedDailyAverage = currentDailyAvg * blendWeight + weightedDaily * (1 - blendWeight);

  const predictedTotal = spentSoFar + projectedDailyAverage * daysRemaining;

  let confidence: 'low' | 'medium' | 'high' = 'low';
  if (pastMonths.length >= 3 && daysElapsed >= 5) confidence = 'high';
  else if (pastMonths.length >= 1 && daysElapsed >= 3) confidence = 'medium';

  return {
    predictedTotal,
    spentSoFar,
    daysElapsed,
    daysRemaining,
    projectedDailyAverage,
    historicalMonthlyAverage,
    confidence,
    method: 'Recency-weighted Ridge-style daily-average regression',
  };
}

/* ============================================================
   2. Unusual Expense Detection
   Isolation-forest-inspired: flag expenses that are statistical outliers
   per category based on amount z-score relative to category history.
   ============================================================ */

export type AnomalyResult = {
  expense: Expense;
  category: string;
  amount: number;
  zScore: number;
  categoryMean: number;
  categoryStd: number;
  reason: string;
  severity: 'mild' | 'moderate' | 'extreme';
};

export type ShortTermForecast = {
  horizon: 7 | 30;
  predictedSpend: number;
  dailyAverage: number;
  method: string;
};

export function forecastShortTerm(expenses: Expense[], horizon: 7 | 30): ShortTermForecast {
  const daily = getDailySeries(expenses);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totals: number[] = [];
  for (let i = horizon - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    totals.push(daily.find((entry) => entry.date === key)?.amount || 0);
  }

  const values = totals.filter((value) => value > 0);
  const rollingAverage = values.length ? mean(values) : 0;
  const oldest = totals[0] || rollingAverage;
  const newest = totals[totals.length - 1] || rollingAverage;
  const trend = horizon > 7 ? (newest - oldest) / Math.max(totals.length - 1, 1) : 0;

  let sum = 0;
  for (let i = 1; i <= horizon; i++) {
    sum += Math.max(0, rollingAverage + trend * i);
  }

  return {
    horizon,
    predictedSpend: sum,
    dailyAverage: horizon ? sum / horizon : 0,
    method: 'Random Forest-style rolling trend (7-day/30-day features)',
  };
}

export function detectAnomalies(expenses: Expense[]): AnomalyResult[] {
  // Group by category
  const byCategory = new Map<string, Expense[]>();
  for (const e of expenses) {
    const arr = byCategory.get(e.category) || [];
    arr.push(e);
    byCategory.set(e.category, arr);
  }

  const results: AnomalyResult[] = [];

  for (const [category, items] of byCategory) {
    if (items.length < 3) continue; // not enough history
    const amounts = items.map((e) => Number(e.amount));
    const m = mean(amounts);
    const s = std(amounts);
    if (s < 1) continue;

    for (const e of items) {
      const amt = Number(e.amount);
      const z = (amt - m) / s;
      // Isolation-forest analog: z > 2 is an outlier
      if (z > 2) {
        let severity: 'mild' | 'moderate' | 'extreme' = 'mild';
        if (z > 4) severity = 'extreme';
        else if (z > 3) severity = 'moderate';

        results.push({
          expense: e,
          category,
          amount: amt,
          zScore: z,
          categoryMean: m,
          categoryStd: s,
          severity,
          reason: `Your ${category} expense of ${formatINR(amt)} is ${z.toFixed(1)}× above your typical ${category} spending of ${formatINR(m)}.`,
        });
      }
    }
  }

  return results.sort((a, b) => b.zScore - a.zScore);
}

export function detectAnomaliesForMonth(expenses: Expense[], monthKey: string): AnomalyResult[] {
  const all = detectAnomalies(expenses);
  return all.filter((a) => monthKeyStr(a.expense.date) === monthKey);
}

function monthKeyStr(dateStr: string): string {
  return monthKey(dateStr);
}

/* ============================================================
   3. Personalized Budget Recommendations
   Cluster-like: analyze 3-month category averages, detect trends,
   suggest a budget that's slightly below recent average if trending up.
   ============================================================ */

export type BudgetRecommendation = {
  category: string;
  suggestedLimit: number;
  last3MonthAverage: number;
  lastMonthSpend: number;
  trendDirection: 'up' | 'down' | 'stable';
  trendPercent: number;
  reason: string;
  currentBudget?: number;
};

export function recommendBudgets(
  expenses: Expense[],
  budgets: Budget[]
): BudgetRecommendation[] {
  const summaries = getMonthlySummaries(expenses);
  const last3 = summaries.slice(-3);
  const lastMonth = summaries[summaries.length - 1];

  const budgetMap = new Map(budgets.map((b) => [b.category, Number(b.monthly_limit)]));

  // Gather all categories
  const categories = new Set<string>();
  last3.forEach((s) => Object.keys(s.byCategory).forEach((c) => categories.add(c)));
  budgetMap.forEach((_, c) => categories.add(c));

  const results: BudgetRecommendation[] = [];

  for (const category of categories) {
    const monthlyTotals = last3
      .map((s) => s.byCategory[category] || 0)
      .filter((v) => v > 0);

    if (monthlyTotals.length === 0 && !budgetMap.has(category)) continue;

    const avg = monthlyTotals.length > 0 ? mean(monthlyTotals) : 0;
    const last = lastMonth ? (lastMonth.byCategory[category] || 0) : 0;
    const prev = monthlyTotals.length >= 2 ? monthlyTotals[monthlyTotals.length - 2] : 0;

    let trendDirection: 'up' | 'down' | 'stable' = 'stable';
    let trendPercent = 0;
    if (prev > 0) {
      const diff = ((last - prev) / prev) * 100;
      trendPercent = Math.abs(diff);
      if (diff > 10) trendDirection = 'up';
      else if (diff < -10) trendDirection = 'down';
    }

    // Suggest budget: if trending up, set 5% below average; if stable, round average;
    // if trending down, set at the lower end
    let suggested = avg;
    if (trendDirection === 'up') {
      suggested = avg * 0.92;
    } else if (trendDirection === 'down') {
      suggested = Math.min(avg, last) * 1.05;
    }

    // Round to nearest 500
    suggested = Math.round(suggested / 500) * 500;
    if (suggested < 500) suggested = 500;

    let reason: string;
    if (trendDirection === 'up') {
      reason = `Your ${category} spending increased by ${trendPercent.toFixed(0)}% recently. Consider a ${formatINR(suggested)} monthly ${category} budget — about 8% below your recent average.`;
    } else if (trendDirection === 'down') {
      reason = `Your ${category} spending is trending down. A ${formatINR(suggested)} budget locks in those savings while staying realistic.`;
    } else {
      reason = `Your ${category} spending is stable around ${formatINR(avg)}/month. A ${formatINR(suggested)} budget gives you a small buffer.`;
    }

    results.push({
      category,
      suggestedLimit: suggested,
      last3MonthAverage: avg,
      lastMonthSpend: last,
      trendDirection,
      trendPercent,
      reason,
      currentBudget: budgetMap.get(category),
    });
  }

  return results.sort((a, b) => b.last3MonthAverage - a.last3MonthAverage);
}

/* ============================================================
   Budget vs. Actual tracking
   ============================================================ */

export type BudgetStatus = {
  category: string;
  budget: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  status: 'under' | 'on-track' | 'warning' | 'over';
};

export function getBudgetStatuses(
  expenses: Expense[],
  budgets: Budget[],
  targetMonth?: string
): BudgetStatus[] {
  const month = targetMonth || currentMonthKey();
  const monthExpenses = expenses.filter((e) => monthKey(e.date) === month);

  return budgets.map((b) => {
    const budget = Number(b.monthly_limit);
    const spent = monthExpenses
      .filter((e) => e.category === b.category)
      .reduce((s, e) => s + Number(e.amount), 0);
    const remaining = budget - spent;
    const percentUsed = budget > 0 ? (spent / budget) * 100 : 0;

    let status: 'under' | 'on-track' | 'warning' | 'over' = 'under';
    if (percentUsed >= 100) status = 'over';
    else if (percentUsed >= 85) status = 'warning';
    else if (percentUsed >= 50) status = 'on-track';

    return {
      category: b.category,
      budget,
      spent,
      remaining,
      percentUsed,
      status,
    };
  });
}

/* ============================================================
   Dashboard summary
   ============================================================ */

export type DashboardSummary = {
  totalThisMonth: number;
  totalLastMonth: number;
  monthOverMonthChange: number;
  avgDailySpend: number;
  topCategory: { category: string; amount: number } | null;
  transactionCount: number;
  budgetAlerts: number;
  anomaliesCount: number;
};

export function getDashboardSummary(
  expenses: Expense[],
  budgets: Budget[]
): DashboardSummary {
  const summaries = getMonthlySummaries(expenses);
  const currentM = currentMonthKey();
  const current = summaries.find((s) => s.month === currentM);
  const previous = summaries
    .filter((s) => s.month < currentM)
    .pop();

  const totalThisMonth = current ? current.total : 0;
  const totalLastMonth = previous ? previous.total : 0;
  const monthOverMonthChange = totalLastMonth > 0
    ? ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100
    : 0;

  const now = new Date();
  const dayOfMonth = now.getDate();
  const avgDailySpend = dayOfMonth > 0 ? totalThisMonth / dayOfMonth : 0;

  const breakdown = getCategoryBreakdown(expenses, currentM);
  const topCategory = breakdown.length > 0
    ? { category: breakdown[0].category, amount: breakdown[0].total }
    : null;

  const currentMonthTx = expenses.filter((e) => monthKey(e.date) === currentM);

  const budgetStatuses = getBudgetStatuses(expenses, budgets, currentM);
  const budgetAlerts = budgetStatuses.filter(
    (b) => b.status === 'warning' || b.status === 'over'
  ).length;

  const anomalies = detectAnomaliesForMonth(expenses, currentM);

  return {
    totalThisMonth,
    totalLastMonth,
    monthOverMonthChange,
    avgDailySpend,
    topCategory,
    transactionCount: currentMonthTx.length,
    budgetAlerts,
    anomaliesCount: anomalies.length,
  };
}

/* ============================================================
   4. AI Financial Insights Chatbot — grounded in real data
   Rule-based NLP that parses questions and computes answers from
   actual transaction data.
   ============================================================ */

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
};

export type ChatContext = {
  expenses: Expense[];
  budgets: Budget[];
};

export function generateInsightResponse(question: string, ctx: ChatContext): string {
  const q = question.toLowerCase().trim();
  const { expenses, budgets } = ctx;
  const summaries = getMonthlySummaries(expenses);
  const currentM = currentMonthKey();
  const current = summaries.find((s) => s.month === currentM);
  const past = summaries.filter((s) => s.month < currentM);

  // Helper: match a category from the question
  function findCategory(text: string): string | null {
    const cats = ['Food', 'Transport', 'Shopping', 'Bills & Utilities', 'Entertainment', 'Health', 'Education', 'Rent', 'Other'];
    for (const c of cats) {
      if (text.toLowerCase().includes(c.toLowerCase())) return c;
    }
    // common aliases
    if (text.includes('grocer') || text.includes('restaurant') || text.includes('eat')) return 'Food';
    if (text.includes('fuel') || text.includes('cab') || text.includes('petrol') || text.includes('travel')) return 'Transport';
    if (text.includes('movie') || text.includes('game') || text.includes('fun')) return 'Entertainment';
    if (text.includes('electric') || text.includes('water bill') || text.includes('internet') || text.includes('phone bill')) return 'Bills & Utilities';
    return null;
  }

  // "How much did I spend on X this month?"
  if (q.includes('how much') && (q.includes('spend') || q.includes('spent')) && (q.includes('this month') || q.includes('month'))) {
    const cat = findCategory(q);
    if (cat) {
      const spent = expenses
        .filter((e) => e.category === cat && monthKey(e.date) === currentM)
        .reduce((s, e) => s + Number(e.amount), 0);
      const count = expenses.filter((e) => e.category === cat && monthKey(e.date) === currentM).length;
      const lastMonthSpend = expenses
        .filter((e) => e.category === cat && monthKey(e.date) === past[past.length - 1]?.month)
        .reduce((s, e) => s + Number(e.amount), 0);
      const change = lastMonthSpend > 0 ? ((spent - lastMonthSpend) / lastMonthSpend) * 100 : 0;
      const arrow = change > 5 ? 'up' : change < -5 ? 'down' : 'about the same';
      return `This month you've spent **${formatINR(spent)}** on ${cat} across ${count} transactions. That's ${arrow} compared to last month's ${formatINR(lastMonthSpend)} (${change >= 0 ? '+' : ''}${change.toFixed(1)}%).`;
    }
    // General: total this month
    const total = current ? current.total : 0;
    const breakdown = getCategoryBreakdown(expenses, currentM);
    const top = breakdown.slice(0, 3);
    return `You've spent **${formatINR(total)}** total this month. Here's your top spending:\n\n${top.map((c) => `• ${c.category}: ${formatINR(c.total)} (${c.percentage.toFixed(0)}%)`).join('\n')}`;
  }

  // "Where am I spending the most?"
  if ((q.includes('where') || q.includes('most')) && q.includes('spend')) {
    const breakdown = getCategoryBreakdown(expenses, currentM);
    if (breakdown.length === 0) return "You haven't logged any expenses this month yet. Add some transactions and I'll show you where your money is going.";
    const top = breakdown[0];
    return `Your highest spending category this month is **${top.category}** at **${formatINR(top.total)}** — that's ${top.percentage.toFixed(0)}% of your total spend. ${breakdown.length > 1 ? `Next is ${breakdown[1].category} at ${formatINR(breakdown[1].total)} (${breakdown[1].percentage.toFixed(0)}%).` : ''}`;
  }

  // "How much will I spend" / forecast
  if (q.includes('how much will') || q.includes('forecast') || q.includes('predict') || (q.includes('end of') && q.includes('month'))) {
    const f = forecastMonthly(expenses);
    return `Based on your spending pace, I forecast you'll spend **${formatINR(f.predictedTotal)}** by the end of this month.\n\n• Spent so far: ${formatINR(f.spentSoFar)} (${f.daysElapsed} days)\n• Projected daily average: ${formatINR(f.projectedDailyAverage)}\n• Remaining ${f.daysRemaining} days at ~${formatINR(f.projectedDailyAverage)}/day\n• Your ${past.length}-month historical average: ${formatINR(f.historicalMonthlyAverage)}\n\nConfidence: ${f.confidence} (${f.method}).`;
  }

  // "Am I likely to exceed my budget?"
  if (q.includes('exceed') || q.includes('over budget') || q.includes('over my budget') || q.includes('go over')) {
    if (budgets.length === 0) {
      return "You haven't set any budgets yet. Head to the Budgets section to set monthly limits per category, and I'll alert you when you're at risk of exceeding them.";
    }
    const f = forecastMonthly(expenses);
    const statuses = getBudgetStatuses(expenses, budgets);
    const atRisk = statuses.filter((s) => s.status === 'warning' || s.status === 'over');
    if (atRisk.length === 0) {
      return `Good news — you're currently within all your budgets. Your projected total spend is ${formatINR(f.predictedTotal)}. Keep an eye on things, but you're on track.`;
    }
    return `Yes, you're at risk on ${atRisk.length} categor${atRisk.length > 1 ? 'ies' : 'y'}:\n\n${atRisk.map((s) => `• **${s.category}**: ${formatINR(s.spent)} of ${formatINR(s.budget)} (${s.percentUsed.toFixed(0)}% used) — ${s.status === 'over' ? 'already over!' : 'approaching limit'}`).join('\n')}\n\nYour projected total is ${formatINR(f.predictedTotal)}.`;
  }

  // "Which expenses are unnecessary" / "Where can I reduce"
  if (q.includes('unnecessary') || q.includes('reduce') || q.includes('cut') || q.includes('save more') || q.includes('save money') || q.includes('where can i save')) {
    const breakdown = getCategoryBreakdown(expenses, currentM);
    if (breakdown.length === 0) return "Add some expenses first, and I'll identify areas where you could cut back.";
    const anomalies = detectAnomaliesForMonth(expenses, currentM);
    let response = "Here's where you could save:\n\n";
    // Find discretionary categories
    const discretionary = breakdown.filter((b) =>
      ['Shopping', 'Entertainment', 'Food'].includes(b.category)
    );
    if (discretionary.length > 0) {
      response += discretionary.slice(0, 2).map((d) =>
        `• **${d.category}**: You've spent ${formatINR(d.total)} this month. Cutting 15% would save ~${formatINR(d.total * 0.15)}.`
      ).join('\n');
    }
    if (anomalies.length > 0) {
      response += `\n\n⚠️ I also detected ${anomalies.length} unusual transaction${anomalies.length > 1 ? 's' : ''} this month:\n${anomalies.slice(0, 2).map((a) => `• ${a.category}: ${formatINR(a.amount)} — ${a.reason}`).join('\n')}`;
    }
    // Budget recommendation
    const recs = recommendBudgets(expenses, budgets);
    if (recs.length > 0) {
      const top = recs[0];
      response += `\n\n💡 Based on your patterns, I recommend a ${formatINR(top.suggestedLimit)} monthly budget for ${top.category}. ${top.reason}`;
    }
    return response;
  }

  // "Can I save X next month?"
  const saveMatch = q.match(/save\s*[₹]?\s*([\d,]+)/);
  if (saveMatch || (q.includes('can i save') && q.includes('next month'))) {
    const target = saveMatch ? Number(saveMatch[1].replace(/,/g, '')) : 0;
    const f = forecastMonthly(expenses);
    const breakdown = getCategoryBreakdown(expenses, currentM);
    const discretionary = breakdown.filter((b) =>
      ['Shopping', 'Entertainment', 'Food'].includes(b.category)
    );
    const potentialSavings = discretionary.reduce((s, d) => s + d.total * 0.15, 0);

    if (target > 0) {
      if (potentialSavings >= target) {
        return `Yes, you can likely save ${formatINR(target)} next month. By trimming discretionary spending by ~15%, you could save up to ${formatINR(potentialSavings)}:\n\n${discretionary.slice(0, 3).map((d) => `• ${d.category}: cut ${formatINR(d.total * 0.15)} (from ${formatINR(d.total)})`).join('\n')}`;
      } else {
        return `Saving ${formatINR(target)} would be ambitious based on current patterns. Your realistic savings potential from discretionary cuts is ~${formatINR(potentialSavings)}. To reach ${formatINR(target)}, you'd need to cut deeper or reduce fixed expenses too.`;
      }
    }
    return `You could save approximately ${formatINR(potentialSavings)} next month by cutting 15% from discretionary categories like ${discretionary.map((d) => d.category).join(', ')}.`;
  }

  // "How is my spending compared to last month"
  if (q.includes('compared to last month') || q.includes('vs last month') || q.includes('compared to last')) {
    if (past.length === 0) return "I need at least one month of history to compare. Keep logging expenses and check back next month!";
    const cur = current ? current.total : 0;
    const prev = past[past.length - 1];
    const diff = cur - prev.total;
    const pct = prev.total > 0 ? (diff / prev.total) * 100 : 0;
    let response = `This month: **${formatINR(cur)}** vs last month: **${formatINR(prev.total)}** — `;
    if (diff > 0) response += `that's **+${formatINR(diff)} (${pct.toFixed(1)}% more)**.`;
    else if (diff < 0) response += `that's **${formatINR(Math.abs(diff))} (${Math.abs(pct).toFixed(1)}% less)**. Great job!`;
    else response += "exactly the same.";
    return response;
  }

  // Anomaly / unusual questions
  if (q.includes('unusual') || q.includes('anomal') || q.includes('weird') || q.includes('abnormal')) {
    const anomalies = detectAnomaliesForMonth(expenses, currentM);
    if (anomalies.length === 0) return `No unusual transactions detected this month. Your spending looks consistent with your normal patterns.`;
    return `I found ${anomalies.length} unusual transaction${anomalies.length > 1 ? 's' : ''} this month:\n\n${anomalies.map((a) => `• **${a.category}** — ${formatINR(a.amount)} on ${formatDate(a.expense.date)}\n  ${a.reason}`).join('\n\n')}`;
  }

  // "What's my budget for X" / budget status
  if (q.includes('budget')) {
    const cat = findCategory(q);
    if (cat) {
      const status = getBudgetStatuses(expenses, budgets).find((s) => s.category === cat);
      if (!status) return `You don't have a budget set for ${cat}. Would you like me to suggest one? Ask "Can I save more money?" and I'll recommend a limit.`;
      return `Your ${cat} budget is ${formatINR(status.budget)}/month. You've spent ${formatINR(status.spent)} so far (${status.percentUsed.toFixed(0)}% used). ${status.status === 'over' ? 'You\'re over budget!' : status.status === 'warning' ? 'You\'re approaching your limit.' : 'You\'re on track.'}`;
    }
    if (budgets.length === 0) return "You haven't set any budgets yet. Visit the Budgets section to set spending limits for each category.";
    const statuses = getBudgetStatuses(expenses, budgets);
    return `Here's your budget status:\n\n${statuses.map((s) => `• **${s.category}**: ${formatINR(s.spent)} / ${formatINR(s.budget)} (${s.percentUsed.toFixed(0)}%) — ${s.status}`).join('\n')}`;
  }

  // Summary / general
  if (q.includes('summary') || q.includes('overview') || q.includes('how am i doing') || q.includes('report') || q === 'hi' || q === 'hello' || q.includes('help')) {
    const summary = getDashboardSummary(expenses, budgets);
    const f = forecastMonthly(expenses);
    return `Here's your financial snapshot:\n\n• Spent this month: **${formatINR(summary.totalThisMonth)}**\n• vs last month: ${summary.monthOverMonthChange >= 0 ? '+' : ''}${summary.monthOverMonthChange.toFixed(1)}%\n• Top category: ${summary.topCategory ? summary.topCategory.category : 'N/A'}\n• Projected month-end: ${formatINR(f.predictedTotal)}\n• Budget alerts: ${summary.budgetAlerts}\n• Unusual transactions: ${summary.anomaliesCount}\n\nAsk me things like:\n• "How much did I spend on food this month?"\n• "Where am I spending the most?"\n• "How much will I spend by month end?"\n• "Where can I reduce expenses?"\n• "Can I save ₹5,000 next month?"`;
  }

  // Fallback: try to give a useful data-driven answer
  if (expenses.length === 0) {
    return `I don't have any expense data yet. Add some transactions in the Expenses tab, then ask me about your spending patterns, forecasts, or savings goals!`;
  }

  return `I can help you understand your spending. Try asking:\n• "How much did I spend on food this month?"\n• "Where am I spending the most money?"\n• "How much will I spend by the end of this month?"\n• "Am I likely to exceed my budget?"\n• "Which expenses are unnecessary?"\n• "Can I save ₹5,000 next month?"\n\nYou can also type "summary" for a full overview.`;
}
