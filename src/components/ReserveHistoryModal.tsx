import React from 'react';
import { PiggyBank, X, Calendar, User, DollarSign, Sparkles } from 'lucide-react';
import { IncomeSource } from '../types';

interface ReserveHistoryModalProps {
  incomes: IncomeSource[];
  reservePercentage: number;
  onClose: () => void;
}

export const ReserveHistoryModal: React.FC<ReserveHistoryModalProps> = ({
  incomes,
  reservePercentage,
  onClose,
}) => {
  // Filter extra incomes across all recorded months
  const extraIncomes = incomes.filter(i => i.type === 'extra');

  const totalReserve = extraIncomes.reduce(
    (acc, curr) => acc + (curr.amount * reservePercentage) / 100,
    0
  );

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-500/20 text-teal-300 rounded-xl border border-teal-500/30">
              <PiggyBank className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Histórico da Reserva do Casal</h2>
              <p className="text-xs text-slate-400">Aportes Automáticos de {reservePercentage}% sobre Rendas Extras</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOTAL SUMMARY CARD */}
        <div className="bg-gradient-to-r from-teal-950/80 to-slate-950 p-4 rounded-xl border border-teal-800/50 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-teal-300 font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Total Acumulado na Reserva
            </span>
            <p className="text-2xl font-extrabold text-teal-300 mt-0.5">
              R$ {totalReserve.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right text-xs text-slate-400">
            <span>{extraIncomes.length} aporte(s) registrado(s)</span>
          </div>
        </div>

        {/* LOG LIST */}
        <div className="space-y-2">
          {extraIncomes.length === 0 ? (
            <div className="text-center py-8 bg-slate-950 rounded-xl border border-slate-800">
              <p className="text-xs text-slate-500 italic">
                Nenhum aporte na reserva gerado ainda. Cadastre uma "Renda Extra" na aba de rendas para iniciar os aportes.
              </p>
            </div>
          ) : (
            extraIncomes.map(inc => {
              const contribution = (inc.amount * reservePercentage) / 100;
              return (
                <div
                  key={inc.id}
                  className="bg-slate-950 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{inc.description}</span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                        {inc.monthYear}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Origem: <strong className="text-slate-200">{inc.userName}</strong> (Renda Extra R$ {inc.amount.toFixed(2)})
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-teal-300 block">
                      + R$ {contribution.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      ({reservePercentage}% de aporte)
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
