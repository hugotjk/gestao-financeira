/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  AppSettings,
  ExpenseItem,
  IncomeSource,
  MonthlyProportionalSummary,
  ParsedBillData,
  ReserveContribution,
} from './types';
import {
  loadLocalData,
  saveLocalData,
  subscribeToRealtimeChanges,
  cascadeNameChange,
  fetchServerData,
  pushServerData,
} from './lib/supabase';
import { calculateProportionalSummary } from './lib/calculator';
import { generateExcelReport } from './lib/exportToExcel';

import { Header } from './components/Header';
import { DashboardSummary } from './components/DashboardSummary';
import { IncomeSection } from './components/IncomeSection';
import { ExpenseSection } from './components/ExpenseSection';
import { BillDistributionModal } from './components/BillDistributionModal';
import { OcrScannerModal } from './components/OcrScannerModal';
import { CardInvoiceSplitterModal } from './components/CardInvoiceSplitterModal';
import { ProfileSettingsModal } from './components/ProfileSettingsModal';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { ReserveHistoryModal } from './components/ReserveHistoryModal';

import { SQL_SCHEMA_SCRIPT } from './data/schema';

export default function App() {
  const [currentMonth, setCurrentMonth] = useState('2026-07');

  // Core Data State
  const [settings, setSettings] = useState<AppSettings>({
    p1Name: 'Hugo Alves',
    p2Name: 'Mariana Dique',
    reservePercentage: 20,
  });
  const [incomes, setIncomes] = useState<IncomeSource[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSupabaseOpen, setIsSupabaseOpen] = useState(false);
  const [isDistributionOpen, setIsDistributionOpen] = useState(false);
  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const [isCardSplitterOpen, setIsCardSplitterOpen] = useState(false);
  const [isReserveHistoryOpen, setIsReserveHistoryOpen] = useState(false);
  const [focusUnconfirmed, setFocusUnconfirmed] = useState(false);

  // Core sync helper
  const syncServerAndLocalData = async () => {
    setIsSyncing(true);
    try {
      const serverData = await fetchServerData();
      const localData = loadLocalData();

      if (serverData) {
        const localHasItems = localData.incomes.length > 0 || localData.expenses.length > 0;
        const serverHasItems = serverData.incomes.length > 0 || serverData.expenses.length > 0;

        if (localHasItems && !serverHasItems) {
          // Push existing local data from computer session to server storage
          await pushServerData(localData.settings, localData.incomes, localData.expenses);
        } else if (serverData.updatedAt > (localData.updatedAt || 0) || (!localHasItems && serverHasItems)) {
          // Server has newer or existing data, update local state & local storage
          setSettings(serverData.settings);
          setIncomes(serverData.incomes);
          setExpenses(serverData.expenses);
          saveLocalData(serverData.settings, serverData.incomes, serverData.expenses, false);
        } else if (localHasItems && serverHasItems && localData.updatedAt > serverData.updatedAt) {
          // Local data is newer, push to server
          await pushServerData(localData.settings, localData.incomes, localData.expenses);
        }
      } else if (localData.incomes.length > 0 || localData.expenses.length > 0) {
        // Server has no data file yet, push local data to create it
        await pushServerData(localData.settings, localData.incomes, localData.expenses);
      }
    } catch (err) {
      console.warn('Sync error:', err);
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  // Load initial data & auto sync
  useEffect(() => {
    // 1. Load local cache immediately
    const { settings: loadedSettings, incomes: loadedIncomes, expenses: loadedExpenses } = loadLocalData();
    setSettings(loadedSettings);
    setIncomes(loadedIncomes);
    setExpenses(loadedExpenses);

    // 2. Fetch server cloud data immediately
    syncServerAndLocalData();

    // 3. Listen to window focus (e.g. opening app on phone or returning to browser tab)
    const handleFocus = () => {
      syncServerAndLocalData();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // 4. Interval polling every 10 seconds for seamless multi-device live sync
    const interval = setInterval(() => {
      syncServerAndLocalData();
    }, 10000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      clearInterval(interval);
    };
  }, []);

  // Setup Realtime Sync Subscription for local tabs
  useEffect(() => {
    const unsubscribe = subscribeToRealtimeChanges(() => {
      setIsSyncing(true);
      const { settings: updatedS, incomes: updatedI, expenses: updatedE } = loadLocalData();
      setSettings(updatedS);
      setIncomes(updatedI);
      setExpenses(updatedE);
      setTimeout(() => setIsSyncing(false), 500);
    });

    return () => unsubscribe();
  }, []);

  // Persist State Whenever Modified
  const updateAppData = (newSettings: AppSettings, newIncomes: IncomeSource[], newExpenses: ExpenseItem[]) => {
    setSettings(newSettings);
    setIncomes(newIncomes);
    setExpenses(newExpenses);
    saveLocalData(newSettings, newIncomes, newExpenses, true);
  };

  // Filtered month datasets
  const monthIncomes = useMemo(() => {
    return incomes.filter(i => i.monthYear === currentMonth);
  }, [incomes, currentMonth]);

  const monthExpenses = useMemo(() => {
    return expenses.filter(e => e.monthYear === currentMonth);
  }, [expenses, currentMonth]);

  // Proportional Financial Summary
  const summary: MonthlyProportionalSummary = useMemo(() => {
    return calculateProportionalSummary(
      settings.p1Name,
      settings.p2Name,
      monthIncomes,
      monthExpenses,
      settings.reservePercentage
    );
  }, [settings, monthIncomes, monthExpenses]);

  // Compute Couple Reserve Contributions
  const reserveContributions: ReserveContribution[] = useMemo(() => {
    return incomes
      .filter(i => i.type === 'extra')
      .map(inc => ({
        id: `res-${inc.id}`,
        monthYear: inc.monthYear,
        incomeSourceId: inc.id,
        userId: inc.userId,
        userName: inc.userName,
        extraIncomeDescription: inc.description,
        extraIncomeAmount: inc.amount,
        percentageApplied: settings.reservePercentage,
        reserveAmount: (inc.amount * settings.reservePercentage) / 100,
        createdAt: inc.createdAt,
      }));
  }, [incomes, settings.reservePercentage]);

  // --- HANDLERS: INCOMES ---
  const handleAddIncome = (incomeData: Omit<IncomeSource, 'id' | 'createdAt'>) => {
    const newInc: IncomeSource = {
      ...incomeData,
      id: `inc-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    updateAppData(settings, [...incomes, newInc], expenses);
  };

  const handleUpdateIncome = (updatedInc: IncomeSource) => {
    const newIncomes = incomes.map(i => (i.id === updatedInc.id ? updatedInc : i));
    updateAppData(settings, newIncomes, expenses);
  };

  const handleDeleteIncome = (id: string) => {
    const newIncomes = incomes.filter(i => i.id !== id);
    updateAppData(settings, newIncomes, expenses);
  };

  // --- HANDLERS: EXPENSES ---
  const handleAddExpense = (expenseData: Omit<ExpenseItem, 'id' | 'updatedAt'>) => {
    const newExp: ExpenseItem = {
      ...expenseData,
      id: `exp-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };
    updateAppData(settings, incomes, [...expenses, newExp]);
  };

  const handleBatchAddExpenses = (expensesToSave: Omit<ExpenseItem, 'id' | 'updatedAt'>[]) => {
    const newItems: ExpenseItem[] = expensesToSave.map((item, idx) => ({
      ...item,
      id: `exp-card-${Date.now()}-${idx}`,
      updatedAt: new Date().toISOString(),
    }));
    updateAppData(settings, incomes, [...expenses, ...newItems]);
  };

  const handleUpdateExpense = (updatedExp: ExpenseItem) => {
    const newExpenses = expenses.map(e => (e.id === updatedExp.id ? updatedExp : e));
    updateAppData(settings, incomes, newExpenses);
  };

  const handleDeleteExpense = (id: string) => {
    const newExpenses = expenses.filter(e => e.id !== id);
    updateAppData(settings, incomes, newExpenses);
  };

  // --- CASCADING PROFILE NAME UPDATE ---
  const handleSaveSettings = (newP1Name: string, newP2Name: string, newReservePercentage: number) => {
    const oldP1 = settings.p1Name;
    const oldP2 = settings.p2Name;

    const { updatedIncomes, updatedExpenses } = cascadeNameChange(
      incomes,
      expenses,
      oldP1,
      newP1Name,
      oldP2,
      newP2Name
    );

    const newSettings: AppSettings = {
      ...settings,
      p1Name: newP1Name,
      p2Name: newP2Name,
      reservePercentage: newReservePercentage,
    };

    updateAppData(newSettings, updatedIncomes, updatedExpenses);
  };

  // --- BILL ASSIGNMENTS FROM DISTRIBUTION ALGORITHM ---
  const handleApplyAssignments = (assignments: { billId: string; assignedTo: 'p1' | 'p2' }[]) => {
    const assignmentMap = new Map(assignments.map(a => [a.billId, a.assignedTo]));
    const newExpenses = expenses.map(e => {
      if (assignmentMap.has(e.id)) {
        return { ...e, assignedTo: assignmentMap.get(e.id)! };
      }
      return e;
    });
    updateAppData(settings, incomes, newExpenses);
  };

  // --- OCR DETECTED BILL ---
  const handleBillFromOcr = (parsed: ParsedBillData) => {
    const newExp: ExpenseItem = {
      id: `exp-ocr-${Date.now()}`,
      monthYear: currentMonth,
      description: parsed.description || 'Conta Digitalizada',
      category: 'Utilidades',
      divisionType: 'shared',
      expenseType: parsed.amount ? 'fixed' : 'estimated',
      estimatedAmount: parsed.amount || 0,
      actualAmount: parsed.amount || 0,
      isConfirmed: !!parsed.amount,
      dueDate: parsed.dueDate || new Date().toISOString().slice(0, 10),
      paymentStatus: 'pending',
      paidBy: 'none',
      assignedTo: 'none',
      barcode: parsed.barcode || '',
      pixCode: parsed.pixCode || '',
      notes: 'Importado via Leitor OCR / Pix',
      updatedAt: new Date().toISOString(),
    };
    updateAppData(settings, incomes, [...expenses, newExp]);
  };

  // --- EXPORT TO EXCEL ---
  const handleExportExcel = () => {
    generateExcelReport(currentMonth, summary, monthExpenses, reserveContributions);
  };

  const handleClearAllData = () => {
    updateAppData(settings, [], []);
  };

  const handleCopyFromPreviousMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    const prevExpenses = expenses.filter(e => e.monthYear === prevMonthStr);
    const prevIncomes = incomes.filter(i => i.monthYear === prevMonthStr);

    if (prevExpenses.length === 0 && prevIncomes.length === 0) {
      alert(`Não foram encontradas contas ou rendas cadastradas no mês anterior (${prevMonthStr}).`);
      return;
    }

    // Copy expenses
    const newExpenses: ExpenseItem[] = prevExpenses.map(exp => {
      let day = '10';
      if (exp.dueDate) {
        const parts = exp.dueDate.split('-');
        if (parts.length === 3) day = parts[2];
      }
      const newDueDate = `${currentMonth}-${day}`;

      return {
        ...exp,
        id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        monthYear: currentMonth,
        dueDate: newDueDate,
        actualAmount: exp.expenseType === 'estimated' ? 0 : exp.actualAmount,
        isConfirmed: exp.expenseType === 'fixed' ? true : false,
        paymentStatus: 'pending',
        paidBy: 'none',
        assignedTo: 'none',
        updatedAt: new Date().toISOString(),
      };
    });

    // Copy incomes (fixed incomes)
    const newIncomes: IncomeSource[] = prevIncomes
      .filter(inc => inc.type === 'fixed')
      .map(inc => ({
        ...inc,
        id: `inc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        monthYear: currentMonth,
        createdAt: new Date().toISOString(),
      }));

    updateAppData(settings, [...incomes, ...newIncomes], [...expenses, ...newExpenses]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* HEADER */}
      <Header
        currentMonth={currentMonth}
        onMonthChange={setCurrentMonth}
        settings={settings}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenSupabase={() => setIsSupabaseOpen(true)}
        onOpenDistribution={() => setIsDistributionOpen(true)}
        onOpenNewExpense={() => {
          // Open new expense modal
          const newExp: Omit<ExpenseItem, 'id' | 'updatedAt'> = {
            monthYear: currentMonth,
            description: 'Nova Conta',
            category: 'Geral',
            divisionType: 'shared',
            expenseType: 'fixed',
            actualAmount: 0,
            isConfirmed: true,
            dueDate: new Date().toISOString().slice(0, 10),
            paymentStatus: 'pending',
            paidBy: 'none',
          };
          handleAddExpense(newExp);
        }}
        onExportExcel={handleExportExcel}
        isSyncing={isSyncing}
      />

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* DASHBOARD CARDS & TRAVA DE SEGURANÇA BANNER */}
        <DashboardSummary
          summary={summary}
          reservePercentage={settings.reservePercentage}
          onOpenReserveHistory={() => setIsReserveHistoryOpen(true)}
          onFocusUnconfirmed={() => setFocusUnconfirmed(true)}
        />

        {/* INCOMES SECTION */}
        <IncomeSection
          currentMonth={currentMonth}
          p1Name={settings.p1Name}
          p2Name={settings.p2Name}
          incomes={monthIncomes}
          reservePercentage={settings.reservePercentage}
          onAddIncome={handleAddIncome}
          onUpdateIncome={handleUpdateIncome}
          onDeleteIncome={handleDeleteIncome}
        />

        {/* EXPENSES SECTION */}
        <ExpenseSection
          currentMonth={currentMonth}
          p1Name={settings.p1Name}
          p2Name={settings.p2Name}
          expenses={monthExpenses}
          onAddExpense={handleAddExpense}
          onUpdateExpense={handleUpdateExpense}
          onDeleteExpense={handleDeleteExpense}
          focusUnconfirmedTab={focusUnconfirmed}
          onCopyFromPreviousMonth={handleCopyFromPreviousMonth}
        />

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <p>
          Gestão Financeira Familiar Proporcional &bull; Hospedagem Vercel & Supabase Realtime
        </p>
      </footer>

      {/* MODALS */}
      {isCardSplitterOpen && (
        <CardInvoiceSplitterModal
          settings={settings}
          currentMonth={currentMonth}
          onApplyExpenses={handleBatchAddExpenses}
          onClose={() => setIsCardSplitterOpen(false)}
        />
      )}
      {isSettingsOpen && (
        <ProfileSettingsModal
          settings={settings}
          onSaveSettings={handleSaveSettings}
          onClearAllData={handleClearAllData}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {isSupabaseOpen && (
        <SupabaseConfigModal
          sqlScript={SQL_SCHEMA_SCRIPT}
          onClose={() => setIsSupabaseOpen(false)}
        />
      )}

      {isDistributionOpen && (
        <BillDistributionModal
          summary={summary}
          expenses={monthExpenses}
          onApplyAssignments={handleApplyAssignments}
          onClose={() => setIsDistributionOpen(false)}
        />
      )}

      {isOcrOpen && (
        <OcrScannerModal
          onBillDetected={handleBillFromOcr}
          onClose={() => setIsOcrOpen(false)}
        />
      )}

      {isReserveHistoryOpen && (
        <ReserveHistoryModal
          incomes={incomes}
          reservePercentage={settings.reservePercentage}
          onClose={() => setIsReserveHistoryOpen(false)}
        />
      )}

    </div>
  );
}
