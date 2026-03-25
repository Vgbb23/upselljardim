/**
 * Vercel Serverless: POST /api/pix/charge — proxy para a Fruitfy (mesma lógica que server.ts).
 * Credenciais só no servidor: FRUITFY_API_TOKEN, FRUITFY_STORE_ID.
 */
const DEFAULT_BASE = 'https://api.fruitfy.io';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const token = process.env.FRUITFY_API_TOKEN;
  const storeId = process.env.FRUITFY_STORE_ID;
  const base = (
    process.env.FRUITFY_API_BASE_URL ||
    process.env.FRUITFY_BASE_URL ||
    DEFAULT_BASE
  ).replace(/\/$/, '');

  if (!token || !storeId) {
    return res.status(500).json({
      success: false,
      message:
        'Credenciais da Fruitfy ausentes na Vercel. Defina FRUITFY_API_TOKEN e FRUITFY_STORE_ID.',
    });
  }

  try {
    const body = typeof req.body === 'object' && req.body !== null ? req.body : {};
    const fruitfyResponse = await fetch(`${base}/api/pix/charge`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Store-Id': storeId,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Language': 'pt_BR',
      },
      body: JSON.stringify(body),
    });

    const text = await fruitfyResponse.text();
    let parsed;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { success: false, message: text || 'Resposta inválida da Fruitfy.' };
    }

    res.status(fruitfyResponse.status).setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.send(JSON.stringify(parsed));
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: 'Falha ao comunicar com a Fruitfy.',
      error: e instanceof Error ? e.message : 'Unknown error',
    });
  }
}
