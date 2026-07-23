import React, { useState } from 'react';
import { Database, X, Copy, Check, ExternalLink, ShieldCheck, Server, FileCode, Sparkles } from 'lucide-react';
import { saveSupabaseCredentials, getSupabaseClient } from '../lib/supabase';

interface SupabaseConfigModalProps {
  sqlScript: string;
  onClose: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  sqlScript,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'sql'>('config');
  const [url, setUrl] = useState(localStorage.getItem('supabase_url') || import.meta.env.VITE_SUPABASE_URL || '');
  const [key, setKey] = useState(localStorage.getItem('supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '');
  const [copied, setCopied] = useState(false);
  const [savedStatus, setSavedStatus] = useState<string | null>(null);

  const client = getSupabaseClient();
  const isConnected = !!client;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseCredentials(url.trim(), key.trim());
    setSavedStatus('Configurações salvas! Reiniciando cliente Supabase e escuta em tempo real...');
    setTimeout(() => {
      setSavedStatus(null);
      onClose();
      window.location.reload();
    }, 1200);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Integração Supabase & Sincronização Realtime</h2>
              <p className="text-xs text-slate-400">PostgreSQL / Realtime Multi-dispositivos / Guia Vercel</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('config')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'config' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <span>Credenciais & Status</span>
          </button>

          <button
            onClick={() => setActiveTab('sql')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'sql' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-indigo-400" />
            <span>Schema SQL do Banco</span>
          </button>
        </div>

        {activeTab === 'config' ? (
          <form onSubmit={handleSave} className="space-y-4">
            
            {/* STATUS BADGE */}
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
              isConnected
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}>
              <ShieldCheck className={`w-5 h-5 ${isConnected ? 'text-emerald-400' : 'text-slate-500'}`} />
              <div>
                <p className="font-bold">
                  {isConnected ? 'Conectado ao Supabase Realtime' : 'Modo de Armazenamento Local / Demo'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isConnected
                    ? 'As alterações feitas por qualquer pessoa no celular ou computador são sincronizadas instantaneamente sem recarregar a página.'
                    : 'O aplicativo está salvando dados localmente. Insira a URL e Anon Key do Supabase abaixo para ativar o banco PostgreSQL em nuvem com sincronização instantânea.'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Supabase Project URL (VITE_SUPABASE_URL)
              </label>
              <input
                type="text"
                placeholder="https://your-project.supabase.co"
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Supabase Anon Key (VITE_SUPABASE_ANON_KEY)
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={key}
                onChange={e => setKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            {savedStatus && (
              <p className="text-xs text-emerald-400 bg-emerald-950/50 p-2 rounded-lg border border-emerald-800/50">
                {savedStatus}
              </p>
            )}

            {/* VERCEL DEPLOYMENT QUICK GUIDE */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-300">
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Como Conectar no Supabase e Hospedar Gratuitamente na Vercel:
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400">
                <li>Crie um projeto gratuito no <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline">supabase.com</a></li>
                <li>Vá em <strong>SQL Editor</strong> e cole o código da aba 'Schema SQL do Banco' abaixo.</li>
                <li>Em <strong>Project Settings &gt; API</strong>, copie a URL do Projeto e a chave Anon (public).</li>
                <li>Na <strong>Vercel</strong>, adicione as variáveis <code className="text-emerald-300">VITE_SUPABASE_URL</code> e <code className="text-emerald-300">VITE_SUPABASE_ANON_KEY</code> nas Configurações de Ambiente (Environment Variables).</li>
              </ol>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md"
              >
                Salvar Credenciais
              </button>
            </div>

          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Execute o script abaixo no <strong>SQL Editor</strong> do seu projeto no Supabase:
              </p>
              <button
                onClick={handleCopySql}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'Copiado!' : 'Copiar Código SQL'}</span>
              </button>
            </div>

            <pre className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto max-h-[350px]">
              {sqlScript}
            </pre>
          </div>
        )}

      </div>
    </div>
  );
};
