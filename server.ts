import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  const DB_FILE = path.join(process.cwd(), 'data_db.json');

  let serverRoomsCache: Record<string, {
    settings?: any;
    incomes?: any[];
    expenses?: any[];
    updatedAt?: number;
  }> = {};

  try {
    if (fs.existsSync(DB_FILE)) {
      const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(fileContent);
      if (parsed && (parsed.settings || parsed.incomes || parsed.expenses)) {
        serverRoomsCache['casal_hugo_mariana'] = parsed;
      } else if (parsed && typeof parsed === 'object') {
        serverRoomsCache = parsed;
      }
      console.log('Loaded persistent app rooms data from server disk storage.');
    }
  } catch (err) {
    console.error('Failed to read db file:', err);
  }

  // API routes FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Server Data Persistence Sync Endpoints
  app.get('/api/data', (req, res) => {
    const room = (req.query?.room as string) || (req.headers['x-sync-room'] as string) || 'casal_hugo_mariana';
    const cleanRoom = room.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'casal_hugo_mariana';

    const roomData = serverRoomsCache[cleanRoom];
    if (!roomData) {
      return res.json({ hasData: false });
    }
    return res.json({
      hasData: true,
      ...roomData,
    });
  });

  app.post('/api/data', (req, res) => {
    try {
      const room = (req.query?.room as string) || (req.headers['x-sync-room'] as string) || 'casal_hugo_mariana';
      const cleanRoom = room.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'casal_hugo_mariana';

      const { settings, incomes, expenses, updatedAt } = req.body;
      const newTimestamp = updatedAt || Date.now();

      serverRoomsCache[cleanRoom] = {
        settings,
        incomes: incomes || [],
        expenses: expenses || [],
        updatedAt: newTimestamp,
      };

      fs.writeFileSync(DB_FILE, JSON.stringify(serverRoomsCache, null, 2), 'utf-8');
      return res.json({ success: true, updatedAt: newTimestamp });
    } catch (err: any) {
      console.error('Failed to save db file:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // OCR Endpoint using Gemini Vision
  app.post('/api/ocr', async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'imageBase64 parameter is required' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
      }

      const ai = new GoogleGenAI({ apiKey });
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Você é um leitor OCR especialista em boletos bancários, concessionárias (luz/gás/água) e faturas Pix no Brasil.
Analise a imagem/documento anexado e extraia os dados com extrema precisão em formato JSON rigoroso:
{
  "barcode": "linha digitável ou código de barras de 47 ou 48 dígitos (somente números)",
  "pixCode": "código copia e cola Pix se houver (começa com 000201...)",
  "amount": valor numérico em Reais (ex: 350.90),
  "dueDate": "data de vencimento em formato YYYY-MM-DD",
  "description": "nome da empresa/favorecido/concessionária (ex: Condomínio Edifício Paulista, Enel Distribuição, Cartão Nubank)"
}
Retorne exclusivamente o objeto JSON válido, sem texto introdutório ou markdown extra.`,
              },
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: mimeType || 'image/jpeg',
                },
              },
            ],
          },
        ],
      });

      const responseText = response.text || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return res.json(parsed);
      }

      return res.json({ rawText: responseText });
    } catch (err: any) {
      console.error('Gemini OCR process error:', err);
      return res.status(500).json({ error: err.message || 'Error processing document with Gemini OCR' });
    }
  });

  // Card Statement OCR Endpoint using Gemini Vision
  app.post('/api/parse-card-statement', async (req, res) => {
    try {
      const { imagesBase64, mimeType } = req.body;
      if (!imagesBase64 || (Array.isArray(imagesBase64) && imagesBase64.length === 0)) {
        return res.status(400).json({ error: 'imagesBase64 parameter is required' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
      }

      const ai = new GoogleGenAI({ apiKey });
      const images = Array.isArray(imagesBase64) ? imagesBase64 : [imagesBase64];

      const parts: any[] = [
        {
          text: `Você é um especialista em OCR e leitura de faturas de cartão de crédito do Brasil (Nubank, Itaú, Mercado Pago, Bradesco, Santander, Inter, C6, Caixa, etc.).
Analise a(s) imagem(ns) enviada(s) referente(s) à fatura do cartão de crédito.
Extraia com máxima precisão:
1. "bankName": O nome do banco ou emissor do cartão (ex: "Nubank", "Itaú", "Mercado Pago", "Bradesco", etc.). Se não for identificado claramente, use "Cartão de Crédito".
2. "statementPeriod": Período ou mês de referência se visível (ex: "JUL/2026", "Julho 2026", ou data de vencimento).
3. "totalInvoiceAmount": O valor total da fatura se visível na imagem (ex: 2478.70). Se não constar, coloque null.
4. "items": Lista completa de todas as compras/lançamentos na fatura visíveis na imagem. Cada item deve conter:
   - "date": Data da compra como aparece na imagem (ex: "04 JUN", "04/06", "18/06").
   - "description": Nome do estabelecimento/compras, incluindo parcelas se houver (ex: "Zp*Henrique - Parcela 4/10", "Uber Uber *Trip Help.U", "Ifd*Ifood Club", "TagItaú *HUGOALVESS").
   - "cardDigits": Os 4 últimos dígitos do cartão se constar na imagem (ex: "5715" ou "5540"), ou null se não constar.
   - "amount": Valor numérico em R$ (ex: 168.63). Atenção: remova o "R$" e converta para número com ponto decimal. Se for pagamento/crédito com sinal de menos (ex: -R$ 100,00), mantenha o número negativo.

Exemplo de formato JSON estrito esperado:
{
  "bankName": "Nubank",
  "statementPeriod": "JUL/2026",
  "totalInvoiceAmount": 2478.70,
  "items": [
    {
      "date": "04 JUN",
      "description": "Zp*Henrique - Parcela 4/10",
      "cardDigits": "5715",
      "amount": 168.63
    },
    {
      "date": "04 JUN",
      "description": "Outletinfo - Parcela 4/10",
      "cardDigits": "5715",
      "amount": 266.80
    }
  ]
}

Responda APENAS com o objeto JSON válido, sem qualquer texto introdutório, explicações ou blocos de código adicionais.`,
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

      const responseText = response.text || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return res.json(parsed);
      }

      return res.status(500).json({ error: 'Não foi possível interpretar os dados da fatura em JSON' });
    } catch (err: any) {
      console.error('Card statement OCR error:', err);
      return res.status(500).json({ error: err.message || 'Erro ao processar fatura do cartão com Gemini Vision' });
    }
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
