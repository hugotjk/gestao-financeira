export default async function handler(req: any, res: any) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-sync-room');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const syncRoom = (req.headers['x-sync-room'] as string) || (req.query?.room as string) || 'default_budget';
  const cleanRoom = syncRoom.replace(/[^a-zA-Z0-9_-]/g, '_');
  const targetUrl = `https://kvdb.io/4y9Uu4G4KkWkC7mG1Y7eZ3/room_${cleanRoom}`;

  if (req.method === 'GET') {
    try {
      const response = await fetch(targetUrl);
      if (response.ok) {
        const text = await response.text();
        if (text && text.trim().startsWith('{')) {
          const parsed = JSON.parse(text);
          return res.status(200).json({ hasData: true, ...parsed });
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
        incomes: body.incomes,
        expenses: body.expenses,
        updatedAt: body.updatedAt || Date.now(),
      };

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.warn('kvdb response not ok:', response.status);
      }

      return res.status(200).json({ success: true, updatedAt: payload.updatedAt });
    } catch (err: any) {
      console.error('POST /api/data error:', err);
      return res.status(500).json({ error: 'Failed to persist cloud data' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
