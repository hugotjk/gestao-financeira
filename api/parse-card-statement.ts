import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imagesBase64, mimeType } = req.body || {};
    if (!imagesBase64 || (Array.isArray(imagesBase64) && imagesBase64.length === 0)) {
      return res.status(400).json({ error: 'imagesBase64 parameter is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on Vercel environment' });
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

Responda APENAS com o objeto JSON válido estrito.`,
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
      return res.status(200).json(parsed);
    }

    return res.status(500).json({ error: 'Não foi possível interpretar a fatura' });
  } catch (err: any) {
    console.error('Vercel card statement OCR error:', err);
    return res.status(500).json({ error: err.message || 'Erro no servidor Vercel' });
  }
}
