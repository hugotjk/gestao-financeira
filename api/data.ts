export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    return res.status(200).json({ hasData: false });
  }
  if (req.method === 'POST') {
    return res.status(200).json({ success: true, updatedAt: Date.now() });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
