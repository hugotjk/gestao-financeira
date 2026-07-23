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
// -------------------------------------------------------------------
// LOCAL STORAGE + SERVER DATA SYNC + BROADCAST CHANNEL REALTIME ENGINE
// -------------------------------------------------------------------
const broadcastChannel = typeof window !== 'undefined' ? new BroadcastChannel('family_budget_realtime_channel') : null;

const APP_KEY = 'family_budget_app_2026_v1';

function toBase64UrlClient(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64UrlClient(b64url: string): string {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) {
    b64 += '=';
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export async function fetchServerData() {
  const room = (typeof window !== 'undefined' ? localStorage.getItem('family_budget_sync_room') : null) || 'casal_hugo_mariana';
  const cleanRoom = room.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'casal_hugo_mariana';

  // 1. Try internal API endpoint
  try {
    const res = await fetch(`/api/data?room=${encodeURIComponent(cleanRoom)}`, {
      headers: { 'x-sync-room': cleanRoom },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.hasData) {
        return data as {
          settings: AppSettings;
          incomes: IncomeSource[];
          expenses: ExpenseItem[];
          updatedAt: number;
        };
      }
    }
  } catch (err) {
    console.warn('API route /api/data not available, trying direct cloud fallback...');
  }

  // 2. Direct client-side cloud fallback
  try {
    const kvKey = `room_${cleanRoom}`;
    const kvRes = await fetch(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/${APP_KEY}/${kvKey}`);
    if (kvRes.ok) {
      const text = await kvRes.text();
      if (text && text !== 'null' && text.trim().length > 0) {
        let b64 = text.trim();
        if (b64.startsWith('"') && b64.endsWith('"')) {
          b64 = JSON.parse(b64);
        }
        if (b64 && typeof b64 === 'string') {
          const jsonStr = fromBase64UrlClient(b64);
          const parsed = JSON.parse(jsonStr);
          if (parsed && (parsed.incomes || parsed.expenses || parsed.settings)) {
            return parsed as {
              settings: AppSettings;
              incomes: IncomeSource[];
              expenses: ExpenseItem[];
              updatedAt: number;
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn('Direct cloud fetch failed:', err);
  }

  return null;
}

export async function pushServerData(
  settings: AppSettings,
  incomes: IncomeSource[],
  expenses: ExpenseItem[]
) {
  const timestamp = Date.now();
  localStorage.setItem('family_budget_updated_at', timestamp.toString());
  const room = (typeof window !== 'undefined' ? localStorage.getItem('family_budget_sync_room') : null) || 'casal_hugo_mariana';
  const cleanRoom = room.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'casal_hugo_mariana';
  const payload = { settings, incomes, expenses, updatedAt: timestamp };

  // 1. Try internal API route
  let success = false;
  try {
    const res = await fetch(`/api/data?room=${encodeURIComponent(cleanRoom)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sync-room': cleanRoom,
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      success = true;
    }
  } catch (err) {
    console.warn('API route push failed, trying direct cloud fallback...');
  }

  // 2. Direct client-side cloud fallback
  if (!success) {
    try {
      const kvKey = `room_${cleanRoom}`;
      const jsonStr = JSON.stringify(payload);
      const b64 = toBase64UrlClient(jsonStr);
      await fetch(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${APP_KEY}/${kvKey}/${b64}`, {
        method: 'POST',
        headers: { 'Content-Length': '0' },
      });
    } catch (err) {
      console.warn('Direct cloud push failed:', err);
    }
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
