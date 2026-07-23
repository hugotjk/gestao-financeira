import React, { useState } from 'react';
import { Settings, X, Save, RefreshCw, UserCheck, Percent, AlertCircle, Download, Upload, Key } from 'lucide-react';
import { AppSettings, ExpenseItem, IncomeSource } from '../types';

interface ProfileSettingsModalProps {
  settings: AppSettings;
  incomes?: IncomeSource[];
  expenses?: ExpenseItem[];
  onSaveSettings: (newP1Name: string, newP2Name: string, newReservePercentage: number) => void;
  onClearAllData?: () => void;
  onImportBackup?: (data: { settings: AppSettings; incomes: IncomeSource[]; expenses: ExpenseItem[] }) => void;
  onForceSync?: () => void;
  onClose: () => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  settings,
  incomes = [],
  expenses = [],
  onSaveSettings,
  onClearAllData,
  onImportBackup,
  onForceSync,
  onClose,
}) => {
  const [p1Name, setP1Name] = useState(settings.p1Name);
  const [p2Name, setP2Name] = useState(settings.p2Name);
  const [reservePct, setReservePct] = useState(settings.reservePercentage.toString());
  const [geminiApiKey, setGeminiApiKey] = useState(() => typeof window !== 'undefined' ? (localStorage.getItem('user_gemini_api_key') || '') : '');
  const [syncRoom, setSyncRoom] = useState(() => typeof window !== 'undefined' ? (localStorage.getItem('family_budget_sync_room') || 'casal_hugo_mariana') : 'casal_hugo_mariana');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pct = parseFloat(reservePct.replace(',', '.'));
    if (!p1Name.trim() || !p2Name.trim() || isNaN(pct) || pct < 0 || pct > 100) return;

    if (typeof window !== 'undefined') {
      localStorage.setItem('family_budget_sync_room', syncRoom.trim() || 'casal_hugo_mariana');
    }

    onSaveSettings(p1Name.trim(), p2Name.trim(), pct);
    if (onForceSync) onForceSync();
    onClose();
  };

  const handleExportBackup = () => {
    const dataToExport = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: { p1Name, p2Name, reservePercentage: parseFloat(reservePct) || 20 },
      incomes,
      expenses,
    };

    const jsonStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-orcamento-${p1Name.toLowerCase().replace(/\s+/g, '')}-${p2Name.toLowerCase().replace(/\s+/g, '')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && (parsed.incomes || parsed.expenses || parsed.settings)) {
          if (onImportBackup) {
            onImportBackup({
              settings: parsed.settings || settings,
              incomes: parsed.incomes || [],
              expenses: parsed.expenses || [],
            });
            setImportStatus('Backup importado com sucesso!');
            setTimeout(() => {
              setImportStatus(null);
              onClose();
            }, 1200);
          }
        } else {
          setImportStatus('Arquivo JSON inválido.');
        }
      } catch (err) {
        setImportStatus('Erro ao ler arquivo de backup.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Configurações e Sincronização</h2>
              <p className="text-xs text-slate-400">Nomes do Casal, Sincronização Nuvem e Backup</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* SYNC ROOM KEY FOR MULTI DEVICE */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-indigo-900/50 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-400" />
                Código da Nuvem (Sincroniza Celular + PC)
              </label>
              {onForceSync && (
                <button
                  type="button"
                  onClick={() => {
                    onForceSync();
                    setImportStatus('Sincronizando com a nuvem...');
                    setTimeout(() => setImportStatus(null), 2000);
                  }}
                  className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-2 py-1 rounded-lg flex items-center gap-1 transition-all shrink-0"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Sincronizar</span>
                </button>
              )}
            </div>
            <input
              type="text"
              value={syncRoom}
              onChange={e => setSyncRoom(e.target.value)}
              placeholder="Ex: casal_hugo_mariana"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
            <p className="text-[10px] text-slate-400">
              Coloque o <strong>mesmo código no computador e no celular</strong> para ambos compartilharem os lançamentos em tempo real na Vercel.
            </p>
          </div>

          {/* BACKUP EXPORT & IMPORT */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              Transferência Rápida (Backup JSON)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Baixar Backup</span>
              </button>

              <label className="py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all">
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <span>Restaurar Backup</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackupFile}
                  className="hidden"
                />
              </label>
            </div>
            {importStatus && (
              <p className="text-[11px] text-emerald-400 font-medium text-center">{importStatus}</p>
            )}
          </div>

          {/* P1 NAME */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nome da Pessoa 1
            </label>
            <input
              type="text"
              value={p1Name}
              onChange={e => setP1Name(e.target.value)}
              placeholder="Ex: Hugo Alves"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
              required
            />
          </div>

          {/* P2 NAME */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nome da Pessoa 2
            </label>
            <input
              type="text"
              value={p2Name}
              onChange={e => setP2Name(e.target.value)}
              placeholder="Ex: Mariana Dique"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-medium"
              required
            />
          </div>

          {/* CASCADING UPDATE WARNING NOTE */}
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <RefreshCw className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Ao mudar os nomes, todos os registros antigos do histórico serão renomeados automaticamente.
            </span>
          </div>

          {/* RESERVE PERCENTAGE */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Aporte na Reserva do Casal (% sobre Rendas Extras)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={reservePct}
                onChange={e => setReservePct(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium pr-8"
                required
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-bold">%</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-1">
            <label className="block text-xs font-semibold text-slate-300">
              Chave da API Gemini (Para Leitor IA no Navegador)
            </label>
            <input
              type="password"
              placeholder="Cole sua chave AIzaSy..."
              value={geminiApiKey}
              onChange={e => {
                setGeminiApiKey(e.target.value);
                localStorage.setItem('user_gemini_api_key', e.target.value.trim());
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {onClearAllData && (
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Tem certeza que deseja apagar todas as rendas e despesas para começar com o banco 100% limpo?')) {
                    onClearAllData();
                    onClose();
                  }
                }}
                className="w-full py-2 px-3 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span>Zerar Todos os Lançamentos (Começar do Zero)</span>
              </button>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
