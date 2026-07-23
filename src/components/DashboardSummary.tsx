import React from 'react';
import {
  AlertTriangle,
  PieChart,
  Users,
  ShieldCheck,
  TrendingUp,
  PiggyBank,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { MonthlyProportionalSummary } from '../types';

interface DashboardSummaryProps {
  summary: MonthlyProportionalSummary;
  reservePercentage: number;
  onOpenReserveHistory: () => void;
  onFocusUnconfirmed: () => void;
}

export const DashboardSummary: React.FC<DashboardSummaryProps> = ({
  summary,
  reservePercentage,
  onOpenReserveHistory,
  onFocusUnconfirmed,
}) => {
  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-4 mb-6">
      
      {/* TRAVA DE SEGURANÇA WARNING BANNER */}
      {summary.hasUnconfirmedEstimates ? (
        <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200 shadow-sm animate-pulse">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0 mt-0.5 sm:mt-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                TRAVA DE SEGURANÇA DE FECHAMENTO ATIVA
              </h3>
              <p className="text-xs text-amber-200/90 mt-0.5">
                Existem <span className="font-bold underline">{summary.unconfirmedCount} conta(s) 'Prevista(s)'</span> aguardando o valor real da fatura. A distribuição final de boletos e o fechamento do mês permanecem bloqueados.
              </p>
            </div>
          </div>
          <button
            onClick={onFocusUnconfirmed}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shrink-0 transition-colors shadow-sm"
          >
            Confirmar Valores
          </button>
        </div>
      ) : (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2.5 text-emerald-300 text-xs font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Todas as contas comunitárias estão com valores reais confirmados. Fechamento e divisão liberados!</span>
        </div>
      )}

      {/* KPI CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* CARD 1: RENDAS LÍQUIDAS */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Rendas Líquidas
            </span>
            <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">Dedução Indiv.</span>
          </div>

          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">{summary.p1Name}</span>
                <span className="text-emerald-400 font-bold">{formatCurrency(summary.p1NetIncome)}</span>
              </div>
              <p className="text-[10px] text-slate-500">
                Bruta: {formatCurrency(summary.p1GrossIncome)} - Indiv: {formatCurrency(summary.p1IndividualExpenses)}
              </p>
            </div>

            <div className="border-t border-slate-800 pt-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">{summary.p2Name}</span>
                <span className="text-teal-400 font-bold">{formatCurrency(summary.p2NetIncome)}</span>
              </div>
              <p className="text-[10px] text-slate-500">
                Bruta: {formatCurrency(summary.p2GrossIncome)} - Indiv: {formatCurrency(summary.p2IndividualExpenses)}
              </p>
            </div>
          </div>
        </div>

        {/* CARD 2: PROPORÇÃO DO CASAL */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5 text-indigo-400" />
              Proporção Justa (%)
            </span>
            <span className="text-[10px] text-indigo-300 bg-indigo-950/80 border border-indigo-800/50 px-2 py-0.5 rounded-full font-mono">
              Divisão Renda
            </span>
          </div>

          <div className="mt-2 space-y-2">
            {/* Split Bar */}
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${summary.p1Proportion}%` }}
                className="bg-emerald-500 h-full transition-all duration-500"
                title={`${summary.p1Name}: ${summary.p1Proportion.toFixed(1)}%`}
              />
              <div
                style={{ width: `${summary.p2Proportion}%` }}
                className="bg-teal-400 h-full transition-all duration-500"
                title={`${summary.p2Name}: ${summary.p2Proportion.toFixed(1)}%`}
              />
            </div>

            <div className="flex justify-between text-xs font-bold pt-1">
              <div className="text-emerald-400">
                {summary.p1Name.split(' ')[0]}: <span className="text-white">{summary.p1Proportion.toFixed(1)}%</span>
              </div>
              <div className="text-teal-300 text-right">
                {summary.p2Name.split(' ')[0]}: <span className="text-white">{summary.p2Proportion.toFixed(1)}%</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 leading-tight">
              Baseada na renda líquida disponível de cada um no mês.
            </p>
          </div>
        </div>

        {/* CARD 3: ORÇAMENTO COMUNITÁRIO & METAS */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              Contas Comuns & Metas
            </span>
            <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-800/40">
              Total: {formatCurrency(summary.totalCommunityBudgetNeeded)}
            </span>
          </div>

          <div className="space-y-2 mt-1">
            <div className="flex justify-between items-center text-xs bg-slate-800/60 p-2 rounded-lg border border-slate-700/50">
              <span className="text-slate-300">Meta <strong className="text-emerald-400">{summary.p1Name.split(' ')[0]}</strong>:</span>
              <span className="font-bold text-emerald-400">{formatCurrency(summary.p1Quota)}</span>
            </div>

            <div className="flex justify-between items-center text-xs bg-slate-800/60 p-2 rounded-lg border border-slate-700/50">
              <span className="text-slate-300">Meta <strong className="text-teal-300">{summary.p2Name.split(' ')[0]}</strong>:</span>
              <span className="font-bold text-teal-300">{formatCurrency(summary.p2Quota)}</span>
            </div>
          </div>
        </div>

        {/* CARD 4: RESERVA DO CASAL (APORTE AUTOMÁTICO SOBRE EXTRAS) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <PiggyBank className="w-3.5 h-3.5 text-teal-400" />
                Reserva do Casal
              </span>
              <span className="text-[10px] text-teal-300 font-bold bg-teal-950/80 border border-teal-800/50 px-2 py-0.5 rounded-full">
                {reservePercentage}% s/ Extras
              </span>
            </div>

            <div className="my-1">
              <p className="text-xl font-extrabold text-teal-300">
                {formatCurrency(summary.totalReserveContributions)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Aporte automático sobre rendas extras do mês.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenReserveHistory}
            className="w-full mt-2 py-1.5 text-xs text-teal-300 hover:text-white bg-teal-950/50 hover:bg-teal-900/80 border border-teal-800/60 rounded-lg transition-colors font-medium flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
            <span>Ver Histórico de Reserva</span>
          </button>
        </div>

      </div>
    </div>
  );
};
