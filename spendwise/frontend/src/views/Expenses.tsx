import { useMemo, useState, useEffect } from 'react';
import {
  Plus, Search, Trash2, Pencil, X, Filter, Receipt, AlertCircle, Download, Sparkles,
} from 'lucide-react';
import { supabase, CATEGORIES, CATEGORY_COLORS, type Expense, type ExpenseInsert } from '@/lib/supabase';
import { formatINR, formatDate, monthKey, currentMonthKey, detectAnomaliesForMonth } from '@/lib/analytics';

type Props = {
  expenses: Expense[];
  onChange: () => void;
};

type SortKey = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

function suggestCategory(description: string): string {
  const text = description.toLowerCase();
  const rules: Record<string, string[]> = {
    Food: ['lunch', 'dinner', 'breakfast', 'cafe', 'restaurant', 'groceries', 'coffee', 'food'],
    Transport: ['uber', 'ola', 'taxi', 'bus', 'train', 'metro', 'fuel', 'petrol'],
    Shopping: ['amazon', 'flipkart', 'clothes', 'shoes', 'shopping', 'mobile', 'electronics'],
    'Bills & Utilities': ['electricity', 'water', 'internet', 'mobile bill', 'utility', 'bill'],
    Entertainment: ['movie', 'cinema', 'netflix', 'game', 'concert'],
    Health: ['hospital', 'medicine', 'pharmacy', 'doctor', 'health', 'gym'],
    Education: ['course', 'book', 'tuition', 'college', 'school'],
    Rent: ['house rent', 'apartment rent', 'rent payment'],
  };
  for (const [category, terms] of Object.entries(rules)) {
    if (terms.some((term) => text.includes(term))) return category;
  }
  return 'Other';
}

export default function Expenses({ expenses, onChange }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('date-desc');
  const [monthFilter, setMonthFilter] = useState<string>('all');

  const anomalies = useMemo(() => {
    const set = new Set(detectAnomaliesForMonth(expenses, currentMonthKey()).map((a) => a.expense.id));
    return set;
  }, [expenses]);

  const months = useMemo(() => {
    const set = new Set(expenses.map((e) => monthKey(e.date)));
    return Array.from(set).sort().reverse();
  }, [expenses]);

  const filtered = useMemo(() => {
    let result = [...expenses];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((e) =>
        e.description?.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== 'all') result = result.filter((e) => e.category === categoryFilter);
    if (monthFilter !== 'all') result = result.filter((e) => monthKey(e.date) === monthFilter);
    result.sort((a, b) => {
      switch (sortKey) {
        case 'date-desc': return b.date.localeCompare(a.date);
        case 'date-asc': return a.date.localeCompare(b.date);
        case 'amount-desc': return Number(b.amount) - Number(a.amount);
        case 'amount-asc': return Number(a.amount) - Number(b.amount);
      }
    });
    return result;
  }, [expenses, search, categoryFilter, monthFilter, sortKey]);

  const totalFiltered = filtered.reduce((s, e) => s + Number(e.amount), 0);

  function startEdit(expense: Expense) {
    setEditing(expense);
    setShowForm(true);
  }

  function startNew() {
    setEditing(null);
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) {
      alert('Failed to delete expense. Please try again.');
      return;
    }
    onChange();
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Expenses</h1>
          <p className="text-sm text-slate-400 mt-1">
            {filtered.length} transactions · Total {formatINR(totalFiltered)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const rows = [['date', 'description', 'category', 'amount'], ...expenses.map((e) => [e.date, e.description || '', e.category, e.amount])];
              const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
              const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
              const link = document.createElement('a');
              link.href = url;
              link.download = 'expenses.csv';
              link.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:text-white text-sm font-semibold"
          >
            <Download size={18} />
            Export CSV
          </button>
          <button
            onClick={startNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-400 text-slate-900 hover:bg-teal-300 text-sm font-semibold shadow-lg shadow-teal-400/20"
          >
            <Plus size={18} />
            Add Expense
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search size={16} className="text-slate-500" />
          <input
            type="text"
            placeholder="Search description or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-500" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none cursor-pointer"
          >
            <option value="all" className="bg-slate-800">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-slate-800">{c}</option>
            ))}
          </select>
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none cursor-pointer"
          >
            <option value="all" className="bg-slate-800">All Months</option>
            {months.map((m) => (
              <option key={m} value={m} className="bg-slate-800">{m}</option>
            ))}
          </select>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none cursor-pointer"
          >
            <option value="date-desc" className="bg-slate-800">Newest First</option>
            <option value="date-asc" className="bg-slate-800">Oldest First</option>
            <option value="amount-desc" className="bg-slate-800">Highest Amount</option>
            <option value="amount-asc" className="bg-slate-800">Lowest Amount</option>
          </select>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Receipt size={40} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">
            {expenses.length === 0 ? 'No expenses yet. Click "Add Expense" to get started.' : 'No transactions match your filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((e, i) => {
            const isAnomaly = anomalies.has(e.id);
            const color = CATEGORY_COLORS[e.category] || '#94a3b8';
            return (
              <div
                key={e.id}
                className="glass-card glass-card-hover rounded-xl p-4 flex items-center gap-4 animate-fade-in"
                style={{ animationDelay: `${Math.min(i * 0.03, 0.3)}s` }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${color}1a`, border: `1px solid ${color}33` }}
                >
                  <div className="w-5 h-5 rounded-full" style={{ background: color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium text-sm">{e.category}</span>
                    {isAnomaly && (
                      <span className="flex items-center gap-1 text-xs text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full">
                        <AlertCircle size={11} /> Unusual
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 truncate mt-0.5">
                    {e.description || 'No description'} · {formatDate(e.date)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-white font-semibold">{formatINR(Number(e.amount))}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => startEdit(e)}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(e.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <ExpenseForm
          editing={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            onChange();
          }}
        />
      )}
    </div>
  );
}

function ExpenseForm({
  editing, onClose, onSaved,
}: {
  editing: Expense | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(editing ? editing.amount.toString() : '');
  const [category, setCategory] = useState(editing ? editing.category : CATEGORIES[0]);
  const [description, setDescription] = useState(editing ? editing.description || '' : '');
  const [date, setDate] = useState(editing ? editing.date : new Date().toISOString().slice(0, 10));
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
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    setSaving(true);
    const payload: ExpenseInsert = {
      amount: amt,
      category,
      description: description.trim() || null,
      date,
    };
    let result;
    if (editing) {
      result = await supabase.from('expenses').update(payload).eq('id', editing.id);
    } else {
      result = await supabase.from('expenses').insert(payload);
    }
    setSaving(false);
    if (result.error) {
      setError('Failed to save expense. Please try again.');
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
          <h2 className="font-display text-xl font-bold text-white">
            {editing ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg placeholder-slate-600 outline-none focus:border-teal-400/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((c) => (
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
            <label className="text-xs text-slate-400 mb-1.5 block">Description (optional)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Lunch at cafe, Uber ride..."
                className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-teal-400/50"
              />
              <button
                type="button"
                onClick={() => setCategory(suggestCategory(description) as typeof CATEGORIES[number])}
                disabled={!description.trim()}
                title="Suggest category from description"
                className="px-3 rounded-xl border border-violet-400/30 bg-violet-400/10 text-violet-300 disabled:opacity-40"
              >
                <Sparkles size={16} />
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-teal-400/50"
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
            {saving ? 'Saving...' : editing ? 'Update Expense' : 'Add Expense'}
          </button>
        </form>
      </div>
    </div>
  );
}
