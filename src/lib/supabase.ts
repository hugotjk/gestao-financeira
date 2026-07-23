import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppSettings, ExpenseItem, IncomeSource, ReserveContribution } from '../types';

// Default initial state for out-of-the-box local demo & fallback
const DEFAULT_SETTINGS: AppSettings = {
  p1Name: 'Hugo Alves',
  p2Name: 'Mariana Dique',
  reservePercentage: 20,
};

const DEFAULT_INCOMES: IncomeSource[] = [];

const DEFAULT_EXPENSES: ExpenseItem[] = [];

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const url = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('supabase_url');
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('supabase_key');

  if (url && key) {
    try {
      supabaseClient = createClient(url, key);
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
    }
  }

  return supabaseClient;
}

export function saveSupabaseCredentials(url: string, key: string) {
  if (url) localStorage.setItem('supabase_url', url);
  else localStorage.removeItem('supabase_url');

  if (key) localStorage.setItem('supabase_key', key);
  else localStorage.removeItem('supabase_key');

  supabaseClient = null; // Reset client
}

// -------------------------------------------------------------------
// LOCAL STORAGE + SERVER DATA SYNC + BROADCAST CHANNEL REALTIME ENGINE
// -------------------------------------------------------------------
const broadcastChannel = typeof window !== 'undefined' ? new BroadcastChannel('family_budget_realtime_channel') : null;

export async function fetchServerData() {
  try {
    const res = await fetch('/api/data');
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.hasData) return null;
    return data as {
      settings: AppSettings;
      incomes: IncomeSource[];
      expenses: ExpenseItem[];
      updatedAt: number;
    };
  } catch (err) {
    console.warn('Failed to fetch server data:', err);
    return null;
  }
}

export async function pushServerData(
  settings: AppSettings,
  incomes: IncomeSource[],
  expenses: ExpenseItem[]
) {
  try {
    const timestamp = Date.now();
    localStorage.setItem('family_budget_updated_at', timestamp.toString());
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings, incomes, expenses, updatedAt: timestamp }),
    });
  } catch (err) {
    console.warn('Failed to push server data:', err);
  }
}

export function loadLocalData() {
  const settingsStr = localStorage.getItem('family_budget_settings');
  const incomesStr = localStorage.getItem('family_budget_incomes');
  const expensesStr = localStorage.getItem('family_budget_expenses');
  const updatedAtStr = localStorage.getItem('family_budget_updated_at');

  const settings: AppSettings = settingsStr ? JSON.parse(settingsStr) : DEFAULT_SETTINGS;
  const incomes: IncomeSource[] = incomesStr ? JSON.parse(incomesStr) : DEFAULT_INCOMES;
  const expenses: ExpenseItem[] = expensesStr ? JSON.parse(expensesStr) : DEFAULT_EXPENSES;
  const updatedAt = updatedAtStr ? parseInt(updatedAtStr, 10) : 0;

  return { settings, incomes, expenses, updatedAt };
}

export function saveLocalData(
  settings: AppSettings,
  incomes: IncomeSource[],
  expenses: ExpenseItem[],
  syncToServer = true
) {
  const timestamp = Date.now();
  localStorage.setItem('family_budget_settings', JSON.stringify(settings));
  localStorage.setItem('family_budget_incomes', JSON.stringify(incomes));
  localStorage.setItem('family_budget_expenses', JSON.stringify(expenses));
  localStorage.setItem('family_budget_updated_at', timestamp.toString());

  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'DATA_UPDATED', timestamp });
  }

  if (syncToServer) {
    pushServerData(settings, incomes, expenses);
  }
}

export function subscribeToRealtimeChanges(onUpdate: () => void): () => void {
  // Listen to local BroadcastChannel (for multiple tabs/windows)
  const channelHandler = () => {
    onUpdate();
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', channelHandler);
  }

  // Listen to Supabase Realtime if configured
  const client = getSupabaseClient();
  let supabaseSubscription: any = null;

  if (client) {
    supabaseSubscription = client
      .channel('public:family_budget')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        onUpdate();
      })
      .subscribe();
  }

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', channelHandler);
    }
    if (client && supabaseSubscription) {
      client.removeChannel(supabaseSubscription);
    }
  };
}

/**
 * CASCADING UPDATE:
 * When user changes names (e.g., Hugo -> Hugo Alves), updates all income
 * and expense historical entries to maintain consistent reporting.
 */
export function cascadeNameChange(
  incomes: IncomeSource[],
  expenses: ExpenseItem[],
  oldP1Name: string,
  newP1Name: string,
  oldP2Name: string,
  newP2Name: string
): { updatedIncomes: IncomeSource[]; updatedExpenses: ExpenseItem[] } {
  const updatedIncomes = incomes.map(inc => {
    let name = inc.userName;
    if (inc.userId === 'p1') name = newP1Name;
    if (inc.userId === 'p2') name = newP2Name;
    return { ...inc, userName: name };
  });

  const updatedExpenses = expenses.map(exp => {
    let indName = exp.individualUserName;
    if (exp.individualUserId === 'p1') indName = newP1Name;
    if (exp.individualUserId === 'p2') indName = newP2Name;

    let paidBy = exp.paidBy;
    return {
      ...exp,
      individualUserName: indName,
      paidBy,
    };
  });

  return { updatedIncomes, updatedExpenses };
}
