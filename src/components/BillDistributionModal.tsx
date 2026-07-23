import React, { useState } from 'react';
import {
  SlidersHorizontal,
  X,
  CheckCircle2,
  Copy,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Check,
  Building,
} from 'lucide-react';
import { DistributionResult, ExpenseItem, MonthlyProportionalSummary } from '../types';
import { optimizeBillDistribution } from '../lib/calculator';

interface BillDistributionModalProps {
  summary: MonthlyProportionalSummary;
  expenses: ExpenseItem[];
  onApplyAssignments: (assignments: { billId: string; assignedTo: 'p1' | 'p2' }[]) => void;
  onClose: () => void;
}

export const BillDistributionModal: React.FC<BillDistributionModalProps> = ({
  summary,
  expenses,
  onApplyAssignments,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const sharedBills = expenses.filter(e => e.divisionType === 'shared');

  // Run subset sum solver
  const distribution: DistributionResult = optimizeBillDistribution(
    sharedBills,
    summary.p1Quota,
    summary.p2Quota,
    summary.p1Name,
    summary.p2Name
  );

  const handleApply = () => {
    const assignments = [
      ...distribution.p1AssignedBills.map(b => ({ billId: b.id, assignedTo: 'p1' as const })),
      ...distribution.p2AssignedBills.map(b => ({ billId: b.id, assignedTo: 'p2' as const })),
    ];
    onApplyAssignments(assignments);
    onClose();
  };

  const generateWhatsAppMessage = () => {
    let msg = `📊 *DIVISÃO INTELIGENTE DE BOLETOS (${summary.monthYear})*\n`;
    msg += `-----------------------------------\n`;
    msg += `👥 Proporção: ${summary.p1Name} (${summary.p1Proportion.toFixed(1)}%) | ${summary.p2Name} (${summary.p2Proportion.toFixed(1)}%)\n\n`;

    msg += `💳 *BOLETOS DE ${summary.p1Name.toUpperCase()}* (Total: R$ ${distribution.p1AssignedTotal.toFixed(2)} / Meta: R$ ${summary.p1Quota.toFixed(2)}):\n`;
    distribution.p1AssignedBills.forEach(b => {
      msg += ` • ${b.description}: R$ ${b.actualAmount.toFixed(2)}\n`;
    });

    msg += `\n💳 *BOLETOS DE ${summary.p2Name.toUpperCase()}* (Total: R$ ${distribution.p2AssignedTotal.toFixed(2)} / Meta: R$ ${summary.p2Quota.toFixed(2)}):\n`;
    distribution.p2AssignedBills.forEach(b => {
      msg += ` • ${b.description}: R$ ${b.actualAmount.toFixed(2)}\n`;
    });

    msg += `\n🎯 *EQUALIZAÇÃO:* ${distribution.explanation}`;

    navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-5 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Distribuição Otimizada de Boletos</h2>
              <p className="text-xs text-slate-400">
                Algoritmo Subset Sum para minimizar ou zerar Pix entre o casal.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SAFETY LOCK CHECK */}
        {summary.hasUnconfirmedEstimates && (
          <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-3 flex items-center gap-2.5 text-amber-300 text-xs">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
            <span>
              Atenção: Existem contas com valores previstos não confirmados. A distribuição abaixo utiliza as estimativas atuais.
            </span>
          </div>
        )}

        {/* EXPLANATION BANNER */}
        <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-xl p-3 text-xs text-indigo-200 flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
          <span>{distribution.explanation}</span>
        </div>

        {/* TWO-COLUMN ASSIGNMENT BOXES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* PERSON 1 ASSIGNMENTS */}
          <div className="bg-slate-950 border border-emerald-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h3 className="text-xs font-bold text-emerald-400">{summary.p1Name}</h3>
                <p className="text-[10px] text-slate-400">Meta: R$ {summary.p1Quota.toFixed(2)}</p>
              </div>
              <span className="text-sm font-extrabold text-emerald-300">
                R$ {distribution.p1AssignedTotal.toFixed(2)}
              </span>
            </div>

            <div className="space-y-1.5 min-h-[100px]">
              {distribution.p1AssignedBills.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic py-2">Nenhum boleto atribuído.</p>
              ) : (
                distribution.p1AssignedBills.map(b => (
                  <div key={b.id} className="flex items-center justify-between text-xs bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-200 truncate pr-2">{b.description}</span>
                    <span className="font-bold text-emerald-400 shrink-0">R$ {b.actualAmount.toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* PERSON 2 ASSIGNMENTS */}
          <div className="bg-slate-950 border border-teal-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h3 className="text-xs font-bold text-teal-300">{summary.p2Name}</h3>
                <p className="text-[10px] text-slate-400">Meta: R$ {summary.p2Quota.toFixed(2)}</p>
              </div>
              <span className="text-sm font-extrabold text-teal-300">
                R$ {distribution.p2AssignedTotal.toFixed(2)}
              </span>
            </div>

            <div className="space-y-1.5 min-h-[100px]">
              {distribution.p2AssignedBills.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic py-2">Nenhum boleto atribuído.</p>
              ) : (
                distribution.p2AssignedBills.map(b => (
                  <div key={b.id} className="flex items-center justify-between text-xs bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-200 truncate pr-2">{b.description}</span>
                    <span className="font-bold text-teal-300 shrink-0">R$ {b.actualAmount.toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={generateWhatsAppMessage}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5 text-emerald-400" />
            <span>{copied ? 'Copiado p/ WhatsApp!' : 'Copiar Resumo p/ WhatsApp'}</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Fechar
            </button>
            <button
              onClick={handleApply}
              className="flex-1 sm:flex-none px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Atribuir Boletos aos Apps</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
