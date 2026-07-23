import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API routes FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
