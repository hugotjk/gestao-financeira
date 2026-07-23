import React from 'react';
import {
  Wallet,
  Calendar,
  Settings,
  Download,
  Database,
  SlidersHorizontal,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { AppSettings } from '../types';

interface HeaderProps {
  currentMonth: string;
  onMonthChange: (month: string) => void;
  settings: AppSettings;
  onOpenSettings: () => void;
  onOpenSupabase: () => void;
  onOpenDistribution: () => void;
  onOpenNewExpense: () => void;
  onExportExcel: () => void;
  isSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentMonth,
  onMonthChange,
  settings,
  onOpenSettings,
  onOpenSupabase,
  onOpenDistribution,
  onOpenNewExpense,
  onExportExcel,
  isSyncing,
}) => {
  // Format month YYYY-MM to readable string (e.g. "Julho 2026")
  const formatMonthLabel = (monthStr: string) => {
    try {
      const [year, month] = monthStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    } catch {
      return monthStr;
    }
  };

  const handlePrevMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 2, 1);
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange(newMonth);
  };

  const handleNextMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month, 1);
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange(newMonth);
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  Gestão Proporcional
                  {isSyncing && (
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" title="Sincronizando..." />
                  )}
                </h1>
                <p className="text-xs text-slate-400">
                  Orçamento Familiar: <span className="text-emerald-400 font-medium">{settings.p1Name}</span> & <span className="text-teal-300 font-medium">{settings.p2Name}</span>
                </p>
              </div>
            </div>

            {/* Mobile Month Selector */}
            <div className="flex md:hidden items-center gap-1 bg-slate-800/80 rounded-lg p-1 border border-slate-700">
              <button
                onClick={handlePrevMonth}
                className="px-2 py-1 text-slate-300 hover:text-white text-xs font-semibold"
                title="Mês Anterior"
              >
                &larr;
              </button>
              <span className="text-xs font-medium capitalize px-1 text-emerald-300">
                {formatMonthLabel(currentMonth)}
              </span>
              <button
                onClick={handleNextMonth}
                className="px-2 py-1 text-slate-300 hover:text-white text-xs font-semibold"
                title="Próximo Mês"
              >
                &rarr;
              </button>
            </div>
          </div>

          {/* Controls & Actions */}
          <div className="flex flex-wrap items-center justify-between md:justify-end gap-2 sm:gap-3">
            
            {/* Desktop Month Selector */}
            <div className="hidden md:flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
              <button
                onClick={handlePrevMonth}
                className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded text-xs font-semibold transition-colors"
              >
                &larr; Anterior
              </button>
              <div className="flex items-center gap-1.5 px-3 text-xs font-medium text-emerald-300 capitalize">
                <Calendar className="w-3.5 h-3.5" />
                {formatMonthLabel(currentMonth)}
              </div>
              <button
                onClick={handleNextMonth}
                className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded text-xs font-semibold transition-colors"
              >
                Próximo &rarr;
              </button>
            </div>

            {/* Action Buttons */}
            <button
              onClick={onOpenNewExpense}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Conta</span>
            </button>

            <button
              onClick={onOpenDistribution}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Distribuir Boletos</span>
            </button>

            <button
              onClick={onExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition-all"
              title="Exportar Planilha Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exportar .XLSX</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg border border-transparent hover:border-slate-700 transition-all"
              title="Editar Perfil & Nomes"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenSupabase}
              className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded-lg border border-transparent hover:border-slate-700 transition-all"
              title="Conexão Supabase / SQL Schema"
            >
              <Database className="w-4 h-4" />
            </button>

          </div>
        </div>
      </div>
    </header>
  );
};
