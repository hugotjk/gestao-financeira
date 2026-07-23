import React, { useState } from 'react';
import { CreditCard, X, Plus, CheckCircle2, User, Users } from 'lucide-react';
import { ExpenseItem } from '../types';

interface QuickCardSetupModalProps {
  currentMonth: string;
  p1Name: string;
  p2Name: string;
  onAddBatchExpenses: (expenses: Omit<ExpenseItem, 'id' | 'updatedAt'>[]) => void;
  onClose: () => void;
}

export const QuickCardSetupModal: React.FC<QuickCardSetupModalProps> = ({
  currentMonth,
  p1Name,
  p2Name,
  onAddBatchExpenses,
  onClose,
}) => {
  const [bankName, setBankName] = useState('Nubank');
  const [dueDate, setDueDate] = useState(`${currentMonth}-10`);

  const [p1Amount, setP1Amount] = useState('');
  const [p2Amount, setP2Amount] = useState('');
  const [sharedAmount, setSharedAmount] = useState('');

  const [expenseType, setExpenseType] = useState<'fixed' | 'estimated'>('fixed');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const valP1 = parseFloat(p1Amount.replace(',', '.')) || 0;
    const valP2 = parseFloat(p2Amount.replace(',', '.')) || 0;
    const valShared = parseFloat(sharedAmount.replace(',', '.')) || 0;

    const cardNameClean = bankName.trim() || 'Cartão de Crédito';
    const batch: Omit<ExpenseItem, 'id' | 'updatedAt'>[] = [];

    // 1. Individual P1
    batch.push({
      monthYear: currentMonth,
      description: `Cartão ${cardNameClean} - ${p1Name}`,
      category: 'Cartão de Crédito',
      divisionType: 'individual',
      individualUserId: 'p1',
      individualUserName: p1Name,
      expenseType,
      estimatedAmount: expenseType === 'estimated' ? valP1 : valP1,
      actualAmount: valP1,
      isConfirmed: expenseType === 'fixed' || valP1 > 0,
      dueDate,
      paymentStatus: 'pending',
      paidBy: 'none',
      notes: `Fatura individual de ${p1Name} no cartão ${cardNameClean}`,
    });

    // 2. Individual P2
    batch.push({
      monthYear: currentMonth,
      description: `Cartão ${cardNameClean} - ${p2Name}`,
      category: 'Cartão de Crédito',
      divisionType: 'individual',
      individualUserId: 'p2',
      individualUserName: p2Name,
      expenseType,
      estimatedAmount: expenseType === 'estimated' ? valP2 : valP2,
      actualAmount: valP2,
      isConfirmed: expenseType === 'fixed' || valP2 > 0,
      dueDate,
      paymentStatus: 'pending',
      paidBy: 'none',
      notes: `Fatura individual de ${p2Name} no cartão ${cardNameClean}`,
    });

    // 3. Shared Casal
    batch.push({
      monthYear: currentMonth,
      description: `Cartão ${cardNameClean} - Casal`,
      category: 'Cartão de Crédito',
      divisionType: 'shared',
      expenseType,
      estimatedAmount: expenseType === 'estimated' ? valShared : valShared,
      actualAmount: valShared,
      isConfirmed: expenseType === 'fixed' || valShared > 0,
      dueDate,
      paymentStatus: 'pending',
      paidBy: 'none',
      notes: `Fatura compartilhada do Casal no cartão ${cardNameClean}`,
    });

    onAddBatchExpenses(batch);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Cadastrar Cartão de Crédito (3 Vias)</h2>
              <p className="text-xs text-slate-400">Cria 3 faturas de uma vez: {p1Name}, {p2Name} e Casal.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* BANK NAME PRESETS */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nome do Banco / Cartão
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {['Nubank', 'Itaú', 'Mercado Pago', 'Bradesco', 'Santander', 'Inter', 'C6 Bank'].map(b => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBankName(b)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                    bankName === b
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={bankName}
              onChange={e => setBankName(e.target.value)}
              placeholder="Ex: Nubank Hugo"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Data de Vencimento
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tipo de Valor
              </label>
              <select
                value={expenseType}
                onChange={e => setExpenseType(e.target.value as 'fixed' | 'estimated')}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="fixed">Valor Exato / Já Fechado</option>
                <option value="estimated">Valor Previsto (Estimado)</option>
              </select>
            </div>
          </div>

          {/* 3 VALUES INPUTS */}
          <div className="space-y-2.5 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Valores das 3 Faturas (R$)
            </h3>

            {/* P1 */}
            <div className="flex items-center justify-between gap-3 bg-slate-900 p-2.5 rounded-xl border border-emerald-800/40">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 shrink-0">
                <User className="w-3.5 h-3.5" /> {p1Name} (Individual)
              </span>
              <div className="relative w-32">
                <span className="absolute left-2.5 top-2 text-xs text-slate-500 font-mono">R$</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={p1Amount}
                  onChange={e => setP1Amount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-2 py-1.5 text-xs text-white text-right font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* P2 */}
            <div className="flex items-center justify-between gap-3 bg-slate-900 p-2.5 rounded-xl border border-teal-800/40">
              <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5 shrink-0">
                <User className="w-3.5 h-3.5" /> {p2Name} (Individual)
              </span>
              <div className="relative w-32">
                <span className="absolute left-2.5 top-2 text-xs text-slate-500 font-mono">R$</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={p2Amount}
                  onChange={e => setP2Amount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-2 py-1.5 text-xs text-white text-right font-mono focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* SHARED CASAL */}
            <div className="flex items-center justify-between gap-3 bg-slate-900 p-2.5 rounded-xl border border-indigo-800/40">
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 shrink-0">
                <Users className="w-3.5 h-3.5" /> Casal (Compartilhado)
              </span>
              <div className="relative w-32">
                <span className="absolute left-2.5 top-2 text-xs text-slate-500 font-mono">R$</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={sharedAmount}
                  onChange={e => setSharedAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-2 py-1.5 text-xs text-white text-right font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Gerar as 3 Faturas do Cartão</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
