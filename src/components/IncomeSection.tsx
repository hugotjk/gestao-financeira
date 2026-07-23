import React, { useState } from 'react';
import { Plus, Trash2, Edit2, DollarSign, Sparkles, Check, X } from 'lucide-react';
import { IncomeSource } from '../types';

interface IncomeSectionProps {
  currentMonth: string;
  p1Name: string;
  p2Name: string;
  incomes: IncomeSource[];
  reservePercentage: number;
  onAddIncome: (income: Omit<IncomeSource, 'id' | 'createdAt'>) => void;
  onUpdateIncome: (income: IncomeSource) => void;
  onDeleteIncome: (id: string) => void;
}

export const IncomeSection: React.FC<IncomeSectionProps> = ({
  currentMonth,
  p1Name,
  p2Name,
  incomes,
  reservePercentage,
  onAddIncome,
  onUpdateIncome,
  onDeleteIncome,
}) => {
  const [activeTab, setActiveTab] = useState<'p1' | 'p2'>('p1');
  const [isAdding, setIsAdding] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeSource | null>(null);

  // Form State
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [type, setType] = useState<'fixed' | 'extra'>('fixed');
  const [reservePctStr, setReservePctStr] = useState<string>('0');

  const activeUserName = activeTab === 'p1' ? p1Name : p2Name;
  const filteredIncomes = incomes.filter(i => i.userId === activeTab);

  const resetForm = () => {
    setDescription('');
    setAmountStr('');
    setType('fixed');
    setReservePctStr('0');
    setIsAdding(false);
    setEditingIncome(null);
  };

  const handleTypeChange = (newType: 'fixed' | 'extra') => {
    setType(newType);
    if (!editingIncome) {
      setReservePctStr(newType === 'extra' ? reservePercentage.toString() : '0');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountStr.replace(',', '.'));
    const reservePercentageVal = Math.max(0, parseFloat(reservePctStr.replace(',', '.')) || 0);
    if (!description.trim() || isNaN(amount) || amount <= 0) return;

    if (editingIncome) {
      onUpdateIncome({
        ...editingIncome,
        description: description.trim(),
        amount,
        type,
        reservePercentage: reservePercentageVal,
      });
    } else {
      onAddIncome({
        monthYear: currentMonth,
        userId: activeTab,
        userName: activeUserName,
        description: description.trim(),
        amount,
        type,
        reservePercentage: reservePercentageVal,
      });
    }
    resetForm();
  };

  const startEdit = (inc: IncomeSource) => {
    setEditingIncome(inc);
    setDescription(inc.description);
    setAmountStr(inc.amount.toString());
    setType(inc.type);
    const currentPct = inc.reservePercentage !== undefined
      ? inc.reservePercentage
      : (inc.type === 'extra' ? reservePercentage : 0);
    setReservePctStr(currentPct.toString());
    setIsAdding(true);
  };

  const totalUserFixed = filteredIncomes.filter(i => i.type === 'fixed').reduce((acc, curr) => acc + curr.amount, 0);
  const totalUserExtra = filteredIncomes.filter(i => i.type === 'extra').reduce((acc, curr) => acc + curr.amount, 0);
  const totalUserGross = totalUserFixed + totalUserExtra;

  const totalUserReserve = filteredIncomes.reduce((acc, curr) => {
    const pct = curr.reservePercentage !== undefined
      ? curr.reservePercentage
      : (curr.type === 'extra' ? reservePercentage : 0);
    return acc + (curr.amount * pct) / 100;
  }, 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 mb-6 shadow-sm">
      
      {/* SECTION HEADER & TAB SELECTOR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            Entradas e Fontes de Renda
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cadastre a renda fixa e extras/freelas de cada um no mês.
          </p>
        </div>

        {/* User Switch Tabs */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 self-stretch sm:self-auto">
          <button
            onClick={() => { setActiveTab('p1'); resetForm(); }}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'p1'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {p1Name}
          </button>
          <button
            onClick={() => { setActiveTab('p2'); resetForm(); }}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'p2'
                ? 'bg-teal-400 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {p2Name}
          </button>
        </div>
      </div>

      {/* USER TOTALS SUMMARY RIBBON */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Renda Fixa</span>
          <p className="text-sm font-bold text-white mt-0.5">
            R$ {totalUserFixed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Renda Extra / Freelas</span>
            <span className="text-[10px] text-teal-300 font-bold bg-teal-950 px-1.5 py-0.5 rounded border border-teal-800/50">
              R$ {totalUserExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          {totalUserReserve > 0 ? (
            <p className="text-[10px] text-teal-400/90 mt-2 flex items-center gap-1 font-semibold">
              <Sparkles className="w-3 h-3 text-teal-400 shrink-0" />
              Aporte Reserva: R$ {totalUserReserve.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          ) : (
            <p className="text-[10px] text-slate-500 mt-2">
              Nenhum aporte acumulado no mês
            </p>
          )}
        </div>

        <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-3">
          <span className="text-[10px] text-emerald-400 uppercase font-semibold">Renda Bruta Total</span>
          <p className="text-sm font-extrabold text-emerald-300 mt-0.5">
            R$ {totalUserGross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* ADD / EDIT FORM */}
      {isAdding ? (
        <form onSubmit={handleSave} className="bg-slate-950 border border-emerald-500/30 rounded-xl p-4 mb-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              {editingIncome ? 'Editar Fonte de Renda' : `Adicionar Renda para ${activeUserName}`}
            </h3>
            <button type="button" onClick={resetForm} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-[11px] font-medium text-slate-300 mb-1">Descrição</label>
              <input
                type="text"
                placeholder="Ex: Salário, Projeto Extra, Freela"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amountStr}
                onChange={e => setAmountStr(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">Tipo de Renda</label>
              <select
                value={type}
                onChange={e => handleTypeChange(e.target.value as 'fixed' | 'extra')}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="fixed">Renda Fixa</option>
                <option value="extra">Renda Extra / Freela</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1 flex items-center justify-between">
                <span>% Reserva (Aporte)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={reservePctStr}
                  onChange={e => setReservePctStr(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-7 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-bold">%</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Salvar Renda
            </button>
          </div>
        </form>
      ) : (
        <div className="flex justify-end mb-3">
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Fonte de Renda</span>
          </button>
        </div>
      )}

      {/* INCOME ITEMS LIST */}
      <div className="space-y-2">
        {filteredIncomes.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4 text-center">
            Nenhuma renda cadastrada para {activeUserName} no mês.
          </p>
        ) : (
          filteredIncomes.map(inc => {
            const itemPct = inc.reservePercentage !== undefined
              ? inc.reservePercentage
              : (inc.type === 'extra' ? reservePercentage : 0);
            const itemReserveAmount = (inc.amount * itemPct) / 100;

            return (
              <div
                key={inc.id}
                className="bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 rounded-xl p-3 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      inc.type === 'fixed'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-teal-500/10 text-teal-300 border border-teal-500/20'
                    }`}
                  >
                    {inc.type === 'fixed' ? 'FIX' : 'EXT'}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      {inc.description}
                      {inc.type === 'extra' && (
                        <span className="text-[10px] text-teal-300 bg-teal-950 border border-teal-800/50 px-1.5 py-0.2 rounded font-medium">
                          Renda Extra
                        </span>
                      )}
                    </h4>
                    {itemPct > 0 ? (
                      <p className="text-[10px] text-teal-400/90 mt-0.5">
                        Aporte Reserva ({itemPct}%): R$ {itemReserveAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Sem aporte para reserva (0%)
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-emerald-400">
                    R$ {inc.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(inc)}
                      className="p-1 text-slate-400 hover:text-white"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteIncome(inc.id)}
                      className="p-1 text-slate-400 hover:text-red-400"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
