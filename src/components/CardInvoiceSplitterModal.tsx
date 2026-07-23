import React, { useState } from 'react';
import {
  CreditCard,
  X,
  Upload,
  Sparkles,
  CheckCircle2,
  Trash2,
  Plus,
  Search,
  Users,
  User,
  ArrowRight,
  Receipt,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { AppSettings, CardStatementData, CardStatementItem, ExpenseItem } from '../types';
import { parseCardStatementWithGemini } from '../lib/ocr';

interface CardInvoiceSplitterModalProps {
  settings: AppSettings;
  currentMonth: string; // YYYY-MM
  onApplyExpenses: (expensesToSave: Omit<ExpenseItem, 'id' | 'updatedAt'>[]) => void;
  onClose: () => void;
}

export const CardInvoiceSplitterModal: React.FC<CardInvoiceSplitterModalProps> = ({
  settings,
  currentMonth,
  onApplyExpenses,
  onClose,
}) => {
  const { p1Name, p2Name } = settings;

  const [imagesBase64, setImagesBase64] = useState<string[]>([]);
  const [bankName, setBankName] = useState('Cartão de Crédito');
  const [dueDate, setDueDate] = useState(`${currentMonth}-10`);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  
  const [parsedData, setParsedData] = useState<CardStatementData | null>(null);
  const [items, setItems] = useState<CardStatementItem[]>([]);
  const [filterSearch, setFilterSearch] = useState('');
  const [inlineKey, setInlineKey] = useState(() => typeof window !== 'undefined' ? (localStorage.getItem('user_gemini_api_key') || '') : '');

  const saveInlineKey = (val: string) => {
    setInlineKey(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_gemini_api_key', val.trim());
    }
  };

  // Handle uploading prints/screenshots
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsProcessing(true);
    setStatusMessage(`Carregando ${files.length} imagem(ns)...`);

    const loadedImages: string[] = [];
    let processedCount = 0;

    files.forEach((file: File) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          loadedImages.push(reader.result);
        }
        processedCount++;
        if (processedCount === files.length) {
          setImagesBase64(prev => [...prev, ...loadedImages]);
          setIsProcessing(false);
          setStatusMessage(`${loadedImages.length} print(s) carregado(s). Clique em "Analisar Fatura" abaixo.`);
        }
      };
    });
  };

  const removeImage = (index: number) => {
    setImagesBase64(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyzeWithGemini = async () => {
    if (imagesBase64.length === 0) return;

    setIsProcessing(true);
    setStatusMessage('IA Gemini Lendo itens da fatura... Isso leva poucos segundos.');

    try {
      const res = await parseCardStatementWithGemini(imagesBase64);

      if (res && res.items && Array.isArray(res.items) && res.items.length > 0) {
        setBankName(res.bankName || 'Cartão Nubank/Itaú');
        const formattedItems: CardStatementItem[] = res.items.map((item: any, idx: number) => ({
          id: `item-${Date.now()}-${idx}`,
          date: item.date || '',
          description: item.description || 'Compra em cartão',
          cardDigits: item.cardDigits || undefined,
          amount: typeof item.amount === 'number' ? Math.abs(item.amount) : parseFloat(item.amount) || 0,
          assignedTo: 'shared', // default shared/casal
        }));

        setParsedData(res);
        setItems(formattedItems);
        setStatusMessage(`Sucesso! ${formattedItems.length} compra(s) extraída(s). Agora classifique quem fez cada compra.`);
      } else if (res && res.error) {
        setStatusMessage(res.error);
      } else {
        setStatusMessage('Não foi possível identificar os lançamentos com clareza. Tente um print mais nítido ou insira a chave do Gemini em Configurações.');
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`Erro de conexão ao ler fatura: ${err?.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle item assignment
  const handleSetAssignment = (id: string, assignedTo: 'p1' | 'p2' | 'shared') => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, assignedTo } : item))
    );
  };

  // Batch set visible items
  const handleBatchSetAssignment = (assignedTo: 'p1' | 'p2' | 'shared') => {
    const visibleIds = new Set(filteredItems.map(i => i.id));
    setItems(prev =>
      prev.map(item => (visibleIds.has(item.id) ? { ...item, assignedTo } : item))
    );
  };

  // Add a manual purchase
  const handleAddManualItem = () => {
    const newItem: CardStatementItem = {
      id: `item-${Date.now()}`,
      date: 'Hoje',
      description: 'Nova Compra',
      amount: 50,
      assignedTo: 'shared',
    };
    setItems(prev => [newItem, ...prev]);
  };

  // Remove single purchase
  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  // Calculations
  const p1Items = items.filter(i => i.assignedTo === 'p1');
  const p2Items = items.filter(i => i.assignedTo === 'p2');
  const sharedItems = items.filter(i => i.assignedTo === 'shared');

  const p1Total = p1Items.reduce((acc, curr) => acc + curr.amount, 0);
  const p2Total = p2Items.reduce((acc, curr) => acc + curr.amount, 0);
  const sharedTotal = sharedItems.reduce((acc, curr) => acc + curr.amount, 0);
  const grandTotal = p1Total + p2Total + sharedTotal;

  // Filter items
  const filteredItems = items.filter(i =>
    i.description.toLowerCase().includes(filterSearch.toLowerCase()) ||
    (i.date && i.date.toLowerCase().includes(filterSearch.toLowerCase())) ||
    (i.cardDigits && i.cardDigits.includes(filterSearch))
  );

  // Generate up to 3 expenses
  const handleConfirmAndSave = () => {
    if (items.length === 0) return;

    const expensesToSave: Omit<ExpenseItem, 'id' | 'updatedAt'>[] = [];

    // Expense 1: Individual P1
    if (p1Total > 0) {
      expensesToSave.push({
        monthYear: currentMonth,
        description: `Cartão ${bankName} - ${p1Name}`,
        category: 'Cartão de Crédito',
        divisionType: 'individual',
        individualUserId: 'p1',
        individualUserName: p1Name,
        expenseType: 'fixed',
        actualAmount: p1Total,
        isConfirmed: true,
        dueDate,
        paymentStatus: 'pending',
        notes: `Referente às ${p1Items.length} compras individuais de ${p1Name} na fatura do ${bankName}.`,
        cardItemsBreakdown: p1Items,
      });
    }

    // Expense 2: Individual P2
    if (p2Total > 0) {
      expensesToSave.push({
        monthYear: currentMonth,
        description: `Cartão ${bankName} - ${p2Name}`,
        category: 'Cartão de Crédito',
        divisionType: 'individual',
        individualUserId: 'p2',
        individualUserName: p2Name,
        expenseType: 'fixed',
        actualAmount: p2Total,
        isConfirmed: true,
        dueDate,
        paymentStatus: 'pending',
        notes: `Referente às ${p2Items.length} compras individuais de ${p2Name} na fatura do ${bankName}.`,
        cardItemsBreakdown: p2Items,
      });
    }

    // Expense 3: Casal (Shared)
    if (sharedTotal > 0) {
      expensesToSave.push({
        monthYear: currentMonth,
        description: `Cartão ${bankName} - Casal`,
        category: 'Cartão de Crédito',
        divisionType: 'shared',
        expenseType: 'fixed',
        actualAmount: sharedTotal,
        isConfirmed: true,
        dueDate,
        paymentStatus: 'pending',
        notes: `Referente às ${sharedItems.length} compras compartilhadas do casal na fatura do ${bankName}.`,
        cardItemsBreakdown: sharedItems,
      });
    }

    if (expensesToSave.length === 0) {
      alert('Nenhum item com valor positivo para gerar despesa.');
      return;
    }

    onApplyExpenses(expensesToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-4 md:p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[92vh]">
        
        {/* HEADER */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl shadow-md">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                <span>Divisão de Fatura de Cartão de Crédito</span>
                <span className="text-[10px] font-extrabold bg-indigo-950 text-indigo-300 border border-indigo-800/80 px-2 py-0.5 rounded-full">
                  Leitor IA
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Envie prints do Nubank, Itaú, Mercado Pago ou Bradesco. A IA lê as compras e divide entre {p1Name}, {p2Name} e o Casal.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: UPLOAD IMAGES / SCREENSHOTS */}
        {items.length === 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-6 text-center bg-slate-950/60 transition-all relative cursor-pointer group">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
                  <div className="p-3 bg-indigo-950 text-indigo-400 rounded-full group-hover:scale-110 transition-transform border border-indigo-800/50">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-200">
                    Selecione ou Arraste os Prints da Fatura
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Você pode selecionar 1 ou múltiplos prints da tela da fatura do aplicativo do seu banco.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Bancos Suportados
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {['Nubank', 'Itaú', 'Mercado Pago', 'Bradesco', 'Santander', 'Inter'].map(b => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBankName(b)}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                        bankName === b
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Nome / Apelido do Cartão
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    placeholder="Ex: Cartão Nubank Hugo"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* PREVIEW OF UPLOADED IMAGES */}
            {imagesBase64.length > 0 && (
              <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200">
                    {imagesBase64.length} Print(s) Anexado(s)
                  </h4>
                  <button
                    onClick={() => setImagesBase64([])}
                    className="text-[11px] text-rose-400 hover:underline"
                  >
                    Remover todos
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {imagesBase64.map((img, idx) => (
                    <div key={idx} className="relative group w-20 h-24 rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
                      <img src={img} alt={`Print ${idx}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-80 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleAnalyzeWithGemini}
                  disabled={isProcessing}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-purple-200" />
                  )}
                  <span>{isProcessing ? 'Lendo Fatura com IA Gemini...' : 'Analisar Fatura com IA'}</span>
                </button>
              </div>
            )}

            {/* STATUS MESSAGE & INLINE API KEY INPUT FOR VERCEL */}
            {statusMessage && (
              <div className="space-y-2 bg-indigo-950/40 p-3 rounded-xl border border-indigo-800/40">
                <p className="text-xs text-indigo-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>{statusMessage}</span>
                </p>

                {(statusMessage.includes('Chave') || statusMessage.includes('Vercel') || statusMessage.includes('GEMINI_API_KEY')) && (
                  <div className="pt-2 border-t border-indigo-900/60 flex flex-col sm:flex-row gap-2 items-center">
                    <input
                      type="password"
                      placeholder="Cole aqui sua chave do Gemini (AIzaSy...)"
                      value={inlineKey}
                      onChange={e => saveInlineKey(e.target.value)}
                      className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setStatusMessage('Chave salva! Tentando ler a fatura novamente...');
                        handleAnalyzeWithGemini();
                      }}
                      className="w-full sm:w-auto px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shrink-0"
                    >
                      Salvar e Ler Fatura
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* STEP 2: CLASSIFY & AUDIT PURCHASES */
          <div className="space-y-4">
            {/* TOP BAR / CARD SUMMARY */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
              <div>
                <label className="block text-[10px] text-slate-400 font-semibold uppercase">Nome do Cartão</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-bold mt-0.5"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-semibold uppercase">Data de Vencimento</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white mt-0.5"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setItems([]);
                    setImagesBase64([]);
                  }}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-xl border border-slate-700 transition-all"
                >
                  Enviar Outro Print
                </button>
              </div>
            </div>

            {/* SEARCH & BATCH SETTERS */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Pesquisar compra (ex: Uber, Ifood, TagItaú)..."
                  value={filterSearch}
                  onChange={e => setFilterSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400 font-semibold">Marcar Visíveis para:</span>
                <button
                  type="button"
                  onClick={() => handleBatchSetAssignment('p1')}
                  className="px-2 py-1 text-[11px] bg-emerald-950 text-emerald-300 border border-emerald-800/60 rounded-lg hover:bg-emerald-900 font-medium"
                >
                  {p1Name}
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchSetAssignment('p2')}
                  className="px-2 py-1 text-[11px] bg-teal-950 text-teal-300 border border-teal-800/60 rounded-lg hover:bg-teal-900 font-medium"
                >
                  {p2Name}
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchSetAssignment('shared')}
                  className="px-2 py-1 text-[11px] bg-indigo-950 text-indigo-300 border border-indigo-800/60 rounded-lg hover:bg-indigo-900 font-medium"
                >
                  Casal (Compartilhado)
                </button>
              </div>
            </div>

            {/* PURCHASES LIST */}
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold px-2">
                <span>{filteredItems.length} compras identificadas</span>
                <button
                  onClick={handleAddManualItem}
                  className="text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Adicionar Compra Manual</span>
                </button>
              </div>

              {filteredItems.map(item => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {item.date && (
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 shrink-0">
                        {item.date}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white truncate">
                        {item.description}
                      </p>
                      {item.cardDigits && (
                        <p className="text-[10px] text-slate-500 font-mono">
                          Final cartão: {item.cardDigits}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-bold text-emerald-400 shrink-0">
                      R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* SELECTOR SEGMENT */}
                  <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleSetAssignment(item.id, 'p1')}
                      className={`px-2.5 py-1 text-[11px] rounded-lg font-bold border transition-all ${
                        item.assignedTo === 'p1'
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {p1Name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetAssignment(item.id, 'p2')}
                      className={`px-2.5 py-1 text-[11px] rounded-lg font-bold border transition-all ${
                        item.assignedTo === 'p2'
                          ? 'bg-teal-600 text-white border-teal-500 shadow-sm'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {p2Name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetAssignment(item.id, 'shared')}
                      className={`px-2.5 py-1 text-[11px] rounded-lg font-bold border transition-all ${
                        item.assignedTo === 'shared'
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      👥 Casal
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 ml-1"
                      title="Excluir item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* THREE EXPENSES RESULT PREVIEW BOX */}
            <div className="bg-slate-950 border border-indigo-500/30 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center justify-between">
                <span>Resultado: 3 Despesas a Serem Criadas/Atualizadas</span>
                <span className="text-[11px] font-mono text-slate-400">Total Fatura: R$ {grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {/* Expense 1: P1 */}
                <div className="bg-slate-900 border border-emerald-800/50 p-3 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                      <User className="w-3 h-3" /> Individual ({p1Name})
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{p1Items.length} compra(s)</span>
                  </div>
                  <p className="text-sm font-extrabold text-white">
                    R$ {p1Total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    Despesa: Cartão {bankName} - {p1Name}
                  </p>
                </div>

                {/* Expense 2: P2 */}
                <div className="bg-slate-900 border border-teal-800/50 p-3 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-teal-300 font-bold flex items-center gap-1">
                      <User className="w-3 h-3" /> Individual ({p2Name})
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{p2Items.length} compra(s)</span>
                  </div>
                  <p className="text-sm font-extrabold text-white">
                    R$ {p2Total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    Despesa: Cartão {bankName} - {p2Name}
                  </p>
                </div>

                {/* Expense 3: Casal */}
                <div className="bg-slate-900 border border-indigo-800/50 p-3 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-indigo-300 font-bold flex items-center gap-1">
                      <Users className="w-3 h-3" /> Casal (Compartilhado)
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{sharedItems.length} compra(s)</span>
                  </div>
                  <p className="text-sm font-extrabold text-white">
                    R$ {sharedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    Despesa: Cartão {bankName} - Casal
                  </p>
                </div>
              </div>

              {/* ACTION CONFIRM */}
              <button
                onClick={handleConfirmAndSave}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar e Criar/Atualizar Despesas do Cartão {bankName}</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
