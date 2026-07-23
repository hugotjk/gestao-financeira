// Serverless Cloud Persistence Endpoint for Vercel & Node
const memoryStore = new Map<string, any>();

function toBase64Url(str: string): string {
  const bytes = Buffer.from(str, 'utf-8');
  return bytes.toString('base64url');
}

function fromBase64Url(b64url: string): string {
  return Buffer.from(b64url, 'base64url').toString('utf-8');
}

export default async function handler(req: any, res: any) {
  // Allow CORS for all clients (including Vercel & Mobile)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-sync-room');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const syncRoom = (req.headers['x-sync-room'] as string) || (req.query?.room as string) || 'casal_hugo_mariana';
  const cleanRoom = syncRoom.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'casal_hugo_mariana';
  const appKey = 'family_budget_app_2026_v1';
  const kvKey = `room_${cleanRoom}`;

  if (req.method === 'GET') {
    try {
      // 1. Memory store
      if (memoryStore.has(cleanRoom)) {
        const memData = memoryStore.get(cleanRoom);
        return res.status(200).json({ hasData: true, ...memData });
      }

      // 2. Fetch from Cloud KeyValue Engine
      const kvRes = await fetch(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/${appKey}/${kvKey}`);
      if (kvRes.ok) {
        const text = await kvRes.text();
        if (text && text !== 'null' && text.trim().length > 0) {
          let b64 = text.trim();
          if (b64.startsWith('"') && b64.endsWith('"')) {
            b64 = JSON.parse(b64);
          }
          if (b64 && typeof b64 === 'string') {
            const jsonStr = fromBase64Url(b64);
            const parsed = JSON.parse(jsonStr);
            if (parsed && (parsed.incomes || parsed.expenses || parsed.settings)) {
              memoryStore.set(cleanRoom, parsed);
              return res.status(200).json({ hasData: true, ...parsed });
            }
          }
        }
      }

      return res.status(200).json({ hasData: false });
    } catch (err: any) {
      console.warn('GET /api/data error:', err);
      return res.status(200).json({ hasData: false });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      const payload = {
        settings: body.settings,
        incomes: body.incomes || [],
        expenses: body.expenses || [],
        updatedAt: body.updatedAt || Date.now(),
      };

      // Save in memory
      memoryStore.set(cleanRoom, payload);

      // Save in Cloud KeyValue Engine
      const jsonStr = JSON.stringify(payload);
      const b64 = toBase64Url(jsonStr);

      const kvRes = await fetch(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${appKey}/${kvKey}/${b64}`, {
        method: 'POST',
        headers: { 'Content-Length': '0' },
      });

      if (!kvRes.ok) {
        console.warn('KV POST returned status:', kvRes.status);
      }

      return res.status(200).json({ success: true, updatedAt: payload.updatedAt });
    } catch (err: any) {
      console.error('POST /api/data error:', err);
      return res.status(500).json({ error: 'Failed to persist cloud data' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
