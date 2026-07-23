import React from 'react';
import { CreditCard, X, Receipt, User, Users } from 'lucide-react';
import { CardStatementItem, ExpenseItem } from '../types';

interface CardItemsBreakdownModalProps {
  expense: ExpenseItem;
  p1Name: string;
  p2Name: string;
  onClose: () => void;
}

export const CardItemsBreakdownModal: React.FC<CardItemsBreakdownModalProps> = ({
  expense,
  p1Name,
  p2Name,
  onClose,
}) => {
  const items: CardStatementItem[] = expense.cardItemsBreakdown || [];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{expense.description}</h2>
              <p className="text-xs text-slate-400">Detalhamento dos itens da fatura ({items.length} compras)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOTAL BAR */}
        <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">Valor Total da Despesa</span>
          <span className="text-base font-extrabold text-emerald-400">
            R$ {expense.actualAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* LIST OF ITEMS */}
        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
          {items.length === 0 ? (
            <p className="text-xs text-slate-500 italic text-center py-6">
              Nenhum detalhamento de compras salvo nesta despesa.
            </p>
          ) : (
            items.map((item, idx) => (
              <div
                key={item.id || idx}
                className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-2">
                    {item.date && (
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 shrink-0">
                        {item.date}
                      </span>
                    )}
                    <p className="text-xs font-semibold text-white truncate">
                      {item.description}
                    </p>
                  </div>
                  {item.cardDigits && (
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Final do cartão: {item.cardDigits}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-emerald-300">
                    R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {item.assignedTo === 'p1' ? p1Name : item.assignedTo === 'p2' ? p2Name : 'Casal'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
        >
          Fechar
        </button>

      </div>
    </div>
  );
};
