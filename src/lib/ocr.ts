import { ParsedBillData } from '../types';

/**
 * Clean string to digits only
 */
export function sanitizeDigits(str: string): string {
  return str.replace(/\D/g, '');
}

/**
 * Parse FEBRABAN Linha Digitável or Barcode
 */
export function parseBoletoLine(line: string): ParsedBillData | null {
  const digits = sanitizeDigits(line);

  // Standard Boleto (47 digits) or Utility Boleto (48 digits)
  if (digits.length !== 47 && digits.length !== 48) {
    return null;
  }

  let amount = 0;
  let dueDate: string | undefined = undefined;

  if (digits.length === 47) {
    // Standard Bank Boleto
    // Last 10 digits represent value in cents
    const valueCentsStr = digits.substring(37, 47);
    const cents = parseInt(valueCentsStr, 10);
    if (!isNaN(cents) && cents > 0) {
      amount = cents / 100;
    }

    // Factor date (digits 31 to 34 or 33 to 37)
    const factorStr = digits.substring(33, 37);
    const factor = parseInt(factorStr, 10);
    if (!isNaN(factor) && factor > 1000) {
      // Base date FEBRABAN: 07/10/1997
      const baseDate = new Date(1997, 9, 7);
      baseDate.setDate(baseDate.getDate() + factor);
      dueDate = baseDate.toISOString().slice(0, 10);
    }
  } else if (digits.length === 48) {
    // Utility / Concessionaire Boleto
    // Value is in digits 5 to 15 (cents)
    const valueCentsStr = digits.substring(4, 15);
    const cents = parseInt(valueCentsStr, 10);
    if (!isNaN(cents) && cents > 0) {
      amount = cents / 100;
    }
  }

  return {
    barcode: line.trim(),
    amount: amount > 0 ? amount : undefined,
    dueDate,
    description: digits.length === 48 ? 'Conta de Concessionária (Luz/Água/Gás)' : 'Boleto Bancário',
    rawText: line,
  };
}

/**
 * Parse Pix Copia e Cola EMV String
 */
export function parsePixCode(pixText: string): ParsedBillData | null {
  const text = pixText.trim();
  if (!text.includes('000201') || !text.includes('br.gov.bcb.pix')) {
    return null;
  }

  let amount: number | undefined = undefined;
  let description: string | undefined = 'Pagamento Pix';

  // Look for Tag 54 (Transaction Amount): 54 + len + value
  const tag54Match = text.match(/54(\d{2})(\d+\.\d{2})/);
  if (tag54Match && tag54Match[2]) {
    const parsedVal = parseFloat(tag54Match[2]);
    if (!isNaN(parsedVal)) {
      amount = parsedVal;
    }
  }

  // Look for Merchant Name (Tag 59)
  const tag59Match = text.match(/59(\d{2})([A-Za-z0-9\s]+)/);
  if (tag59Match && tag59Match[2]) {
    description = `Pix - ${tag59Match[2].trim()}`;
  }

  return {
    pixCode: text,
    amount,
    description,
    rawText: text,
  };
}

/**
 * Parse raw text input (autodetects Boleto or Pix or Amount/Dates in text)
 */
export function parseRawText(raw: string): ParsedBillData {
  // Check Pix
  const pixParsed = parsePixCode(raw);
  if (pixParsed) return pixParsed;

  // Check 47/48 digit line
  const boletoParsed = parseBoletoLine(raw);
  if (boletoParsed) return boletoParsed;

  // Check regex for 47 or 48 digits inside longer text
  const digitsMatch = raw.match(/\b\d{5}[\.\s]?\d{5}[\.\s]?\d{5}[\.\s]?\d{6}[\.\s]?\d{5}[\.\s]?\d{6}[\.\s]?\d[\.\s]?\d{14}\b/) ||
                      raw.match(/\b\d{47,48}\b/);
  if (digitsMatch) {
    const parsed = parseBoletoLine(digitsMatch[0]);
    if (parsed) return parsed;
  }

  // Extract amount if "R$" or values are present
  let amount: number | undefined = undefined;
  const valMatch = raw.match(/R\$\s*([\d\.\,]+)/i) || raw.match(/Valor:?\s*([\d\.\,]+)/i);
  if (valMatch && valMatch[1]) {
    const cleanedVal = valMatch[1].replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleanedVal);
    if (!isNaN(parsed)) amount = parsed;
  }

  // Extract date YYYY-MM-DD or DD/MM/YYYY
  let dueDate: string | undefined = undefined;
  const dateMatch = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (dateMatch) {
    dueDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
  }

  return {
    amount,
    dueDate,
    description: 'Boleto / Conta',
    rawText: raw,
  };
}

/**
 * Extract text from PDF file using pdfjs-dist
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    // Set worker src
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }

    return fullText;
  } catch (err) {
    console.warn('PDF.js parsing failed, fallbacking to reader', err);
    return '';
  }
}

/**
 * Gemini Server + Client Fallback OCR
 */
export async function scanDocumentWithGemini(fileBase64: string, mimeType: string): Promise<ParsedBillData | null> {
  try {
    const res = await fetch('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: fileBase64, mimeType }),
    });

    if (res.ok) {
      const data = await res.json();
      return data as ParsedBillData;
    }
  } catch (err) {
    console.warn('Server Gemini OCR API unavailable, trying client fallback...', err);
  }

  // Client-side fallback for Vercel static sites
  const clientKey = typeof window !== 'undefined' ? (localStorage.getItem('user_gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY) : null;
  if (clientKey) {
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: clientKey });
      const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: `Analise a imagem da conta/boleto/comprovante e retorne APENAS um JSON válido no formato: {"barcode": string, "pixCode": string, "amount": number, "dueDate": "YYYY-MM-DD", "description": string}` },
              { inlineData: { data: cleanBase64, mimeType } }
            ]
          }
        ]
      });

      const jsonMatch = (response.text || '').match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('Client Gemini OCR error:', e);
    }
  }

  return null;
}

/**
 * Gemini Credit Card Statement Reader with Vercel Client Fallback
 */
export async function parseCardStatementWithGemini(imagesBase64: string[], mimeType = 'image/jpeg') {
  let serverErrorMsg = '';

  try {
    const res = await fetch('/api/parse-card-statement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imagesBase64, mimeType }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && (data.items || data.bankName)) return data;
      if (data && data.error) serverErrorMsg = data.error;
    } else {
      try {
        const errJson = await res.json();
        if (errJson && errJson.error) serverErrorMsg = errJson.error;
      } catch (_) {}
    }
  } catch (err: any) {
    console.warn('Card statement server API unavailable, trying client fallback...', err);
  }

  // Client-side fallback for Vercel static deployments
  const clientKey = typeof window !== 'undefined'
    ? (localStorage.getItem('user_gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY)
    : null;

  if (clientKey) {
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: clientKey });
      const images = Array.isArray(imagesBase64) ? imagesBase64 : [imagesBase64];

      const parts: any[] = [
        {
          text: `Você é um especialista em OCR e leitura de faturas de cartão de crédito do Brasil (Nubank, Itaú, Mercado Pago, Bradesco, Santander, Inter, C6, Caixa, etc.).
Analise a(s) imagem(ns) enviada(s) referente(s) à fatura do cartão de crédito.
Extraia com máxima precisão:
1. "bankName": Nome do banco ou emissor do cartão.
2. "statementPeriod": Período ou mês de referência.
3. "totalInvoiceAmount": Valor total da fatura se visível (número).
4. "items": Lista completa de compras:
   - "date": Data como aparece na imagem (ex: "04 JUN", "04/06").
   - "description": Nome do estabelecimento/compra.
   - "cardDigits": 4 últimos dígitos do cartão se constar.
   - "amount": Valor numérico em R$ (número positivo).

Responda APENAS com objeto JSON válido estrito.`,
        },
      ];

      for (const img of images) {
        const cleanBase64 = img.replace(/^data:[^;]+;base64,/, '');
        parts.push({
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType || 'image/jpeg',
          },
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts }],
      });

      const jsonMatch = (response.text || '').match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (clientErr: any) {
      console.error('Client card statement OCR error:', clientErr);
      return {
        error: `Erro ao processar imagem no navegador: ${clientErr?.message || 'Chave do Gemini inválida ou limite excedido.'}`
      };
    }
  }

  // If both failed and no key was found
  if (serverErrorMsg) {
    return { error: `Erro no servidor: ${serverErrorMsg}` };
  }

  return {
    error: 'Chave da API Gemini não configurada no link da Vercel! Clique no ícone de Engrenagem (Configurações) no topo da tela para inserir sua chave gratuita do Google AI Studio ou adicione GEMINI_API_KEY no painel da Vercel.'
  };
}
