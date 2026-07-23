import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64, mimeType } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 parameter is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on Vercel environment' });
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
              text: `Você é um leitor de boletos, faturas e comprovantes do Brasil.
Analise a imagem enviada e retorne um JSON estrito no seguinte formato:
{
  "barcode": "linha digitável ou código de barras se houver, somente números ou nulo",
  "pixCode": "código copia e cola do pix se houver, ou nulo",
  "amount": valor numérico do boleto ou conta em reais (ex: 150.50),
  "dueDate": "data de vencimento no formato AAAA-MM-DD se houver",
  "description": "resumo do fornecedor ou serviço (ex: Conta de Luz Light, Condomínio)"
}
Responda APENAS com o objeto JSON válido, sem texto introdutório.`,
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
      return res.status(200).json(parsed);
    }

    return res.status(500).json({ error: 'Não foi possível extrair dados da imagem' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro no servidor Vercel' });
  }
}
