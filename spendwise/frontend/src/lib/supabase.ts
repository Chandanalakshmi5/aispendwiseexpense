import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

export type Expense = {
  id: string;
  amount: number;
  category: string;
  description: string | null;
  date: string;
  is_unusual: boolean;
  created_at: string;
};

export type Budget = {
  id: string;
  category: string;
  monthly_limit: number;
  created_at: string;
};

export type ExpenseInsert = {
  amount: number;
  category: string;
  description?: string | null;
  date: string;
};

export type BudgetInsert = {
  category: string;
  monthly_limit: number;
};

export const CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Bills & Utilities',
  'Entertainment',
  'Health',
  'Education',
  'Rent',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_COLORS: Record<string, string> = {
  Food: '#fb923c',
  Transport: '#38bdf8',
  Shopping: '#f472b6',
  'Bills & Utilities': '#a78bfa',
  Entertainment: '#facc15',
  Health: '#34d399',
  Education: '#60a5fa',
  Rent: '#f87171',
  Other: '#94a3b8',
};
