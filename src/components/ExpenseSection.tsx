import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  Trash2,
  Edit2,
  Copy,
  CheckCircle2,
  Clock,
  AlertCircle,
  Scan,
  Check,
  Lock,
  Unlock,
  Users,
  User,
  X,
} from 'lucide-react';
import { ExpenseItem } from '../types';

interface ExpenseSectionProps {
  currentMonth: string;
  p1Name: string;
  p2Name: string;
  expenses: ExpenseItem[];
  onAddExpense: (expense: Omit<ExpenseItem, 'id' | 'updatedAt'>) => void;
  onUpdateExpense: (expense: ExpenseItem) => void;
  onDeleteExpense: (id: string) => void;
  onOpenOcrScanner: () => void;
  focusUnconfirmedTab?: boolean;
}

export const ExpenseSection: React.FC<ExpenseSectionProps> = ({
  currentMonth,
  p1Name,
  p2Name,
  expenses,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onOpenOcrScanner,
  focusUnconfirmedTab,
}) => {
  const [filterTab, setFilterTab] = useState<
    'all' | 'shared' | 'individual' | 'unconfirmed' | 'pending' | 'paid'
  >(focusUnconfirmedTab ? 'unconfirmed' : 'all');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);

  // Confirm Actual Amount Inline Modal State
  const [confirmingExpense, setConfirmingExpense] = useState<ExpenseItem | null>(null);
  const [actualAmountInput, setActualAmountInput] = useState('');

  // Form State
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Geral');
  const [divisionType, setDivisionType] = useState<'shared' | 'individual'>('shared');
  const [individualUserId, setIndividualUserId] = useState<'p1' | 'p2'>('p1');
  const [expenseType, setExpenseType] = useState<'fixed' | 'estimated'>('fixed');
  const [estimatedAmountStr, setEstimatedAmountStr] = useState('');
  const [actualAmountStr, setActualAmountStr] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(true);
  const [dueDate, setDueDate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>('pending');
  const [paidBy, setPaidBy] = useState<'p1' | 'p2' | 'none'>('none');
  const [barcode, setBarcode] = useState('');
  const [pixCode, setPixCode] = useState('');
  const [notes, setNotes] = useState('');

  // Toast for copy
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const resetForm = () => {
    setDescription('');
    setCategory('Geral');
    setDivisionType('shared');
    setIndividualUserId('p1');
    setExpenseType('fixed');
    setEstimatedAmountStr('');
    setActualAmountStr('');
    setIsConfirmed(true);
    setDueDate(new Date().toISOString().slice(0, 10));
    setPaymentStatus('pending');
    setPaidBy('none');
    setBarcode('');
    setPixCode('');
    setNotes('');
    setIsFormOpen(false);
    setEditingExpense(null);
  };

  const startEdit = (exp: ExpenseItem) => {
    setEditingExpense(exp);
    setDescription(exp.description);
    setCategory(exp.category || 'Geral');
    setDivisionType(exp.divisionType);
    setIndividualUserId(exp.individualUserId || 'p1');
    setExpenseType(exp.expenseType);
    setEstimatedAmountStr(exp.estimatedAmount ? exp.estimatedAmount.toString() : '');
    setActualAmountStr(exp.actualAmount ? exp.actualAmount.toString() : '');
    setIsConfirmed(exp.isConfirmed);
    setDueDate(exp.dueDate);
    setPaymentStatus(exp.paymentStatus);
    setPaidBy(exp.paidBy || 'none');
    setBarcode(exp.barcode || '');
    setPixCode(exp.pixCode || '');
    setNotes(exp.notes || '');
    setIsFormOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const actual = parseFloat(actualAmountStr.replace(',', '.')) || 0;
    const estimated = parseFloat(estimatedAmountStr.replace(',', '.')) || actual;

    if (!description.trim() || !dueDate) return;

    const indName = divisionType === 'individual' ? (individualUserId === 'p1' ? p1Name : p2Name) : undefined;

    if (editingExpense) {
      onUpdateExpense({
        ...editingExpense,
        description: description.trim(),
        category,
        divisionType,
        individualUserId: divisionType === 'individual' ? individualUserId : undefined,
        individualUserName: indName,
        expenseType,
        estimatedAmount: expenseType === 'estimated' ? estimated : actual,
        actualAmount: actual,
        isConfirmed: expenseType === 'fixed' ? true : isConfirmed,
        dueDate,
        paymentStatus,
        paidBy,
        barcode: barcode.trim(),
        pixCode: pixCode.trim(),
        notes: notes.trim(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      onAddExpense({
        monthYear: currentMonth,
        description: description.trim(),
        category,
        divisionType,
        individualUserId: divisionType === 'individual' ? individualUserId : undefined,
        individualUserName: indName,
        expenseType,
        estimatedAmount: expenseType === 'estimated' ? estimated : actual,
        actualAmount: actual,
        isConfirmed: expenseType === 'fixed' ? true : isConfirmed,
        dueDate,
        paymentStatus,
        paidBy,
        assignedTo: 'none',
        barcode: barcode.trim(),
        pixCode: pixCode.trim(),
        notes: notes.trim(),
      });
    }
    resetForm();
  };

  const handleConfirmActualAmount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmingExpense) return;
    const actual = parseFloat(actualAmountInput.replace(',', '.'));
    if (isNaN(actual) || actual < 0) return;

    onUpdateExpense({
      ...confirmingExpense,
      actualAmount: actual,
      isConfirmed: true,
      updatedAt: new Date().toISOString(),
    });

    setConfirmingExpense(null);
    setActualAmountInput('');
  };

  const handleTogglePaymentStatus = (exp: ExpenseItem) => {
    const newStatus = exp.paymentStatus === 'paid' ? 'pending' : 'paid';
    onUpdateExpense({
      ...exp,
      paymentStatus: newStatus,
      paidBy: newStatus === 'paid' ? (exp.paidBy !== 'none' ? exp.paidBy : 'p1') : 'none',
      updatedAt: new Date().toISOString(),
    });
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Filter Expenses
  const filteredExpenses = expenses.filter(exp => {
    if (filterTab === 'shared') return exp.divisionType === 'shared';
    if (filterTab === 'individual') return exp.divisionType === 'individual';
    if (filterTab === 'unconfirmed') return exp.expenseType === 'estimated' && !exp.isConfirmed;
    if (filterTab === 'pending') return exp.paymentStatus === 'pending';
    if (filterTab === 'paid') return exp.paymentStatus === 'paid';
    return true;
  });

  // Calculate Due Date Badge Color
  const getDueDateBadge = (dueDateStr: string, isPaid: boolean) => {
    if (isPaid) {
      return { color: 'bg-emerald-950 text-emerald-400 border-emerald-800/50', label: 'Pago' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr + 'T00:00:00');
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { color: 'bg-red-950 text-red-400 border-red-800/60 animate-pulse', label: `Atrasado (${Math.abs(diffDays)}d)` };
    }
    if (diffDays === 0) {
      return { color: 'bg-red-950 text-red-400 border-red-800/60 font-bold', label: 'Vence Hoje!' };
    }
    if (diffDays <= 5) {
      return { color: 'bg-amber-950 text-amber-300 border-amber-800/60', label: `Vence em ${diffDays}d` };
    }
    return { color: 'bg-slate-800 text-slate-300 border-slate-700', label: `Venc: ${dueDateStr.slice(8, 10)}/${dueDateStr.slice(5, 7)}` };
  };

  const unconfirmedCount = expenses.filter(e => e.expenseType === 'estimated' && !e.isConfirmed).length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 mb-6 shadow-sm">
      
      {/* SECTION HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-400" />
            Contas e Despesas do Mês
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Gerencie boletos comunitários e individuais com trava de segurança para contas previstas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenOcrScanner}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/60 rounded-xl transition-all"
          >
            <Scan className="w-4 h-4 text-indigo-400" />
            <span>Leitor OCR / Pix</span>
          </button>

          <button
            onClick={() => { resetForm(); setIsFormOpen(true); }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Conta</span>
          </button>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex flex-wrap items-center gap-1.5 mb-5 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filterTab === 'all' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-white'
          }`}
        >
          Todas ({expenses.length})
        </button>

        <button
          onClick={() => setFilterTab('shared')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
            filterTab === 'shared' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Compartilhadas</span>
        </button>

        <button
          onClick={() => setFilterTab('individual')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
            filterTab === 'individual' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-white'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Individuais</span>
        </button>

        <button
          onClick={() => setFilterTab('unconfirmed')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            filterTab === 'unconfirmed'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : unconfirmedCount > 0
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Aguardando Boleto ({unconfirmedCount})</span>
        </button>

        <button
          onClick={() => setFilterTab('pending')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filterTab === 'pending' ? 'bg-slate-800 text-amber-400 border border-slate-700' : 'text-slate-400 hover:text-white'
          }`}
        >
          Pendentes
        </button>

        <button
          onClick={() => setFilterTab('paid')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filterTab === 'paid' ? 'bg-slate-800 text-emerald-400 border border-slate-700' : 'text-slate-400 hover:text-white'
          }`}
        >
          Pagas
        </button>
      </div>

      {/* ADD / EDIT FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                {editingExpense ? 'Editar Conta' : 'Nova Conta / Despesa'}
              </h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nome da Despesa / Favorecido *</label>
                <input
                  type="text"
                  placeholder="Ex: Condomínio, Luz, Sabesp, Supermercado"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Categoria</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Moradia">Moradia</option>
                    <option value="Utilidades">Utilidades (Luz/Gás/Água)</option>
                    <option value="Alimentação">Alimentação</option>
                    <option value="Saúde">Saúde</option>
                    <option value="Educação">Educação</option>
                    <option value="Lazer">Lazer / Assinaturas</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Tipo de Divisão</label>
                  <select
                    value={divisionType}
                    onChange={e => setDivisionType(e.target.value as 'shared' | 'individual')}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="shared">Compartilhado (Proporcional)</option>
                    <option value="individual">Individual</option>
                  </select>
                </div>
              </div>

              {divisionType === 'individual' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Responsável pela Despesa Individual</label>
                  <select
                    value={individualUserId}
                    onChange={e => setIndividualUserId(e.target.value as 'p1' | 'p2')}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="p1">{p1Name}</option>
                    <option value="p2">{p2Name}</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Natureza do Valor</label>
                  <select
                    value={expenseType}
                    onChange={e => {
                      const newType = e.target.value as 'fixed' | 'estimated';
                      setExpenseType(newType);
                      if (newType === 'fixed') setIsConfirmed(true);
                      else setIsConfirmed(false);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="fixed">Exata (Fixa)</option>
                    <option value="estimated">Prevista (Flutuante)</option>
                  </select>
                </div>

                {expenseType === 'estimated' ? (
                  <div>
                    <label className="block text-xs font-medium text-amber-300 mb-1">Valor Previsto (Estimado R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={estimatedAmountStr}
                      onChange={e => setEstimatedAmountStr(e.target.value)}
                      className="w-full bg-slate-900 border border-amber-500/50 rounded-lg px-3 py-2 text-xs text-amber-200 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Valor Exato (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={actualAmountStr}
                      onChange={e => setActualAmountStr(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                )}
              </div>

              {expenseType === 'estimated' && (
                <div className="flex items-center gap-2 bg-amber-950/30 p-2.5 rounded-lg border border-amber-800/40 text-xs text-amber-300">
                  <input
                    type="checkbox"
                    id="isConfirmedChk"
                    checked={isConfirmed}
                    onChange={e => {
                      setIsConfirmed(e.target.checked);
                      if (e.target.checked && !actualAmountStr) setActualAmountStr(estimatedAmountStr);
                    }}
                    className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-amber-500"
                  />
                  <label htmlFor="isConfirmedChk" className="cursor-pointer">
                    Já possuo o boleto com o <strong>Valor Real Confirmado</strong> (Libera a Trava)
                  </label>
                </div>
              )}

              {expenseType === 'estimated' && isConfirmed && (
                <div>
                  <label className="block text-xs font-medium text-emerald-400 mb-1">Valor Real do Boleto (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={actualAmountStr}
                    onChange={e => setActualAmountStr(e.target.value)}
                    className="w-full bg-slate-950 border border-emerald-500/60 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Data de Vencimento *</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Status de Pagamento</label>
                  <select
                    value={paymentStatus}
                    onChange={e => setPaymentStatus(e.target.value as 'pending' | 'paid')}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="pending">Pendente</option>
                    <option value="paid">Pago</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Linha Digitável / Código de Barras</label>
                <input
                  type="text"
                  placeholder="Cole o código de 47 ou 48 dígitos"
                  value={barcode}
                  onChange={e => setBarcode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Chave / Código Pix Copia e Cola</label>
                <input
                  type="text"
                  placeholder="000201..."
                  value={pixCode}
                  onChange={e => setPixCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md"
                >
                  Salvar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM ACTUAL AMOUNT QUICK MODAL */}
      {confirmingExpense && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <Unlock className="w-4 h-4 text-amber-400" />
                Confirmar Valor do Boleto
              </h3>
              <button onClick={() => setConfirmingExpense(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Digite o valor real que veio na fatura de <strong className="text-white">{confirmingExpense.description}</strong> para destravar o cálculo final do mês.
            </p>

            <form onSubmit={handleConfirmActualAmount} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Valor Estimado Anterior: R$ {confirmingExpense.estimatedAmount?.toFixed(2)}
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={actualAmountInput}
                  onChange={e => setActualAmountInput(e.target.value)}
                  className="w-full bg-slate-950 border border-amber-500 rounded-lg px-3 py-2 text-sm text-white font-bold focus:outline-none"
                  autoFocus
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmingExpense(null)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950"
                >
                  Confirmar Valor & Destravar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXPENSES LIST GRID / TABLE */}
      <div className="space-y-3">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-8 bg-slate-950/50 rounded-xl border border-slate-800/80">
            <p className="text-xs text-slate-400 italic">
              Nenhuma despesa encontrada para os filtros selecionados.
            </p>
          </div>
        ) : (
          filteredExpenses.map(exp => {
            const dueBadge = getDueDateBadge(exp.dueDate, exp.paymentStatus === 'paid');
            const codeToCopy = exp.pixCode || exp.barcode;

            return (
              <div
                key={exp.id}
                className={`bg-slate-950/90 border rounded-2xl p-4 transition-all ${
                  exp.expenseType === 'estimated' && !exp.isConfirmed
                    ? 'border-amber-500/50 bg-amber-950/10'
                    : exp.paymentStatus === 'paid'
                    ? 'border-slate-800/60 opacity-90'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  {/* Left Column: Info & Badges */}
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        {exp.description}
                      </h3>

                      {/* Division Badge */}
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-900 border-slate-700 text-slate-300">
                        {exp.divisionType === 'shared' ? 'Compartilhado' : `Individual: ${exp.individualUserName || exp.individualUserId}`}
                      </span>

                      {/* Expense Type & Confirmation Badge */}
                      {exp.expenseType === 'estimated' && !exp.isConfirmed ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Aguardando Boleto
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                          Valor Confirmado
                        </span>
                      )}

                      {/* Due Date Badge */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${dueBadge.color}`}>
                        {dueBadge.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span>Categoria: <strong className="text-slate-300">{exp.category}</strong></span>
                      {exp.notes && <span className="italic text-slate-400">"{exp.notes}"</span>}
                    </div>
                  </div>

                  {/* Right Column: Amount & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                    
                    <div className="text-left sm:text-right">
                      {exp.expenseType === 'estimated' && !exp.isConfirmed ? (
                        <div>
                          <span className="text-xs text-amber-300/80 font-medium block">
                            Previsto: R$ {exp.estimatedAmount?.toFixed(2)}
                          </span>
                          <button
                            onClick={() => {
                              setConfirmingExpense(exp);
                              setActualAmountInput(exp.estimatedAmount ? exp.estimatedAmount.toString() : '');
                            }}
                            className="mt-1 px-2.5 py-1 text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors inline-flex items-center gap-1"
                          >
                            <Unlock className="w-3 h-3" />
                            <span>Confirmar Real</span>
                          </button>
                        </div>
                      ) : (
                        <div>
                          <span className="text-base font-extrabold text-white block">
                            R$ {exp.actualAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      
                      {/* Copy Code Button */}
                      {codeToCopy && (
                        <button
                          onClick={() => handleCopyCode(codeToCopy, exp.id)}
                          className="px-2.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-xl border border-slate-700 transition-colors flex items-center gap-1"
                          title="Copiar Código de Barras / Pix"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span className="hidden md:inline">{copiedId === exp.id ? 'Copiado!' : 'Copiar'}</span>
                        </button>
                      )}

                      {/* Payment Status Toggle */}
                      <button
                        onClick={() => handleTogglePaymentStatus(exp)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                          exp.paymentStatus === 'paid'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                        }`}
                      >
                        <CheckCircle2 className={`w-4 h-4 ${exp.paymentStatus === 'paid' ? 'text-emerald-400' : 'text-slate-500'}`} />
                        <span>{exp.paymentStatus === 'paid' ? 'Pago' : 'Dar Baixa'}</span>
                      </button>

                      <button
                        onClick={() => startEdit(exp)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onDeleteExpense(exp.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                    </div>

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
