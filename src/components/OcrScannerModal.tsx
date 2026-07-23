import React, { useState } from 'react';
import {
  Scan,
  X,
  Upload,
  FileText,
  Copy,
  Sparkles,
  Check,
  AlertCircle,
  QrCode,
  CheckCircle2,
} from 'lucide-react';
import { ParsedBillData } from '../types';
import { extractTextFromPDF, parseRawText, scanDocumentWithGemini } from '../lib/ocr';

interface OcrScannerModalProps {
  onBillDetected: (parsed: ParsedBillData) => void;
  onClose: () => void;
}

export const OcrScannerModal: React.FC<OcrScannerModalProps> = ({
  onBillDetected,
  onClose,
}) => {
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedBillData | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleTextParse = () => {
    if (!textInput.trim()) return;
    setIsProcessing(true);
    setStatusMessage('Analisando código de barras e chave Pix...');

    setTimeout(() => {
      const res = parseRawText(textInput);
      setParsedResult(res);
      setIsProcessing(false);
      setStatusMessage('Leitura concluída com sucesso!');
    }, 300);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatusMessage(`Processando arquivo ${file.name}...`);
    setParsedResult(null);

    try {
      if (file.type === 'application/pdf') {
        const text = await extractTextFromPDF(file);
        if (text) {
          const res = parseRawText(text);
          setParsedResult(res);
          setStatusMessage('Texto extraído do PDF com sucesso!');
        } else {
          // Fallback to Gemini OCR
          await triggerGeminiOcr(file);
        }
      } else if (file.type.startsWith('image/')) {
        // Try Gemini Vision OCR
        await triggerGeminiOcr(file);
      } else {
        setStatusMessage('Formato de arquivo não suportado.');
      }
    } catch (err: any) {
      console.error('File OCR error:', err);
      setStatusMessage('Erro ao processar arquivo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerGeminiOcr = async (file: File) => {
    setStatusMessage('Enviando para análise OCR com IA Gemini...');
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = reader.result as string;
      const res = await scanDocumentWithGemini(base64, file.type);
      if (res && (res.amount || res.barcode || res.pixCode)) {
        setParsedResult(res);
        setStatusMessage('IA Gemini identificou os dados do boleto/Pix!');
      } else {
        setStatusMessage('Não foi possível extrair um boleto ou Pix válido dessa imagem.');
      }
    };
  };

  const handleApply = () => {
    if (parsedResult) {
      onBillDetected(parsedResult);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Leitor de Boleto & Pix Copia e Cola</h2>
              <p className="text-xs text-slate-400">OCR Local / PDF / Chave Pix e IA Gemini</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FILE UPLOAD DROPZONE */}
        <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl p-4 text-center bg-slate-950/50 transition-colors relative cursor-pointer group">
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
            <div className="p-3 bg-slate-800 rounded-full text-emerald-400 group-hover:scale-110 transition-transform">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-200">
              Clique para enviar PDF ou Imagem da Conta/QR Code
            </p>
            <p className="text-[10px] text-slate-400">
              Suporta boletos PDF, fotos de faturas (Enel, Sabesp) e QR Codes Pix.
            </p>
          </div>
        </div>

        {/* OR DIVIDER */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-500 uppercase">ou cole o código</span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* PASTE TEXTAREA */}
        <div className="space-y-2">
          <textarea
            rows={3}
            placeholder="Cole aqui a Linha Digitável (47/48 dígitos) ou o Pix Copia e Cola (000201...)"
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
          />

          <button
            onClick={handleTextParse}
            disabled={!textInput.trim() || isProcessing}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5"
          >
            <QrCode className="w-4 h-4" />
            <span>Analisar Código Digitado</span>
          </button>
        </div>

        {/* STATUS INDICATOR */}
        {statusMessage && (
          <p className="text-xs text-indigo-300 bg-indigo-950/40 p-2.5 rounded-lg border border-indigo-800/40 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>{statusMessage}</span>
          </p>
        )}

        {/* DETECTED RESULTS CARD */}
        {parsedResult && (
          <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Dados Identificados
              </h3>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/50 px-2 py-0.5 rounded-full font-bold">
                OK
              </span>
            </div>

            <div className="text-xs space-y-1.5 text-slate-300">
              {parsedResult.description && (
                <p>Favorecido / Nome: <strong className="text-white">{parsedResult.description}</strong></p>
              )}
              {parsedResult.amount ? (
                <p>Valor do Boleto: <strong className="text-emerald-300 text-sm font-extrabold">R$ {parsedResult.amount.toFixed(2)}</strong></p>
              ) : (
                <p className="text-amber-400 text-[11px]">Valor não detectado automaticamente. Você poderá inserir na conta.</p>
              )}
              {parsedResult.dueDate && (
                <p>Vencimento: <strong className="text-white">{parsedResult.dueDate}</strong></p>
              )}
              {parsedResult.barcode && (
                <p className="font-mono text-[10px] text-slate-400 break-all bg-slate-900 p-1.5 rounded border border-slate-800">
                  Barras: {parsedResult.barcode}
                </p>
              )}
              {parsedResult.pixCode && (
                <p className="font-mono text-[10px] text-slate-400 break-all bg-slate-900 p-1.5 rounded border border-slate-800">
                  Pix: {parsedResult.pixCode.slice(0, 40)}...
                </p>
              )}
            </div>

            <button
              onClick={handleApply}
              className="w-full mt-2 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow-md flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Usar Dados na Nova Conta</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
