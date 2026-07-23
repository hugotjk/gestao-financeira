import React, { useState } from 'react';
import { Settings, X, Save, RefreshCw, UserCheck, Percent, AlertCircle } from 'lucide-react';
import { AppSettings } from '../types';

interface ProfileSettingsModalProps {
  settings: AppSettings;
  onSaveSettings: (newP1Name: string, newP2Name: string, newReservePercentage: number) => void;
  onClearAllData?: () => void;
  onClose: () => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  settings,
  onSaveSettings,
  onClearAllData,
  onClose,
}) => {
  const [p1Name, setP1Name] = useState(settings.p1Name);
  const [p2Name, setP2Name] = useState(settings.p2Name);
  const [reservePct, setReservePct] = useState(settings.reservePercentage.toString());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pct = parseFloat(reservePct.replace(',', '.'));
    if (!p1Name.trim() || !p2Name.trim() || isNaN(pct) || pct < 0 || pct > 100) return;

    onSaveSettings(p1Name.trim(), p2Name.trim(), pct);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Configurações de Perfil e Casal</h2>
              <p className="text-xs text-slate-400">Nomes e % de Reserva do Casal</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nome da Pessoa 1 (Ex: Hugo / Hugo Alves)
            </label>
            <input
              type="text"
              value={p1Name}
              onChange={e => setP1Name(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nome da Pessoa 2 (Ex: Mari / Mariana Dique)
            </label>
            <input
              type="text"
              value={p2Name}
              onChange={e => setP2Name(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
              required
            />
          </div>

          {/* CASCADING UPDATE WARNING NOTE */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <RefreshCw className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Atualização em Cadeia:</strong> Ao alterar os nomes, todas as contas, rendas e registros de histórico do passado serão atualizados para manter a consistência do banco de dados.
            </span>
          </div>

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
            <p className="text-[10px] text-slate-500 mt-1">
              Este percentual será aplicado automaticamente como investimento comunitário sobre qualquer Renda Extra / Freela cadastrada.
            </p>
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
