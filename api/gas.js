const ALLOWED_ACTIONS = new Set([
  'login', 'logout', 'overview', 'getLogs',
  'saveCustomer', 'setCustomerStatus', 'deleteCustomer',
  'savePackage', 'generateInvoices', 'payInvoice', 'reversePayment',
  'saveUser', 'saveExpense', 'cancelExpense'
]);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      service: 'Ziel Net Billing Vercel API',
      route: '/api/gas'
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({
      ok: false,
      error: 'Method tidak diizinkan.'
    });
  }

  const gasUrl = process.env.GAS_API_URL;
  const proxySecret = process.env.GAS_PROXY_SECRET;

  if (!gasUrl || !proxySecret) {
    return res.status(500).json({
      ok: false,
      error: 'Environment GAS_API_URL / GAS_PROXY_SECRET belum dikonfigurasi.'
    });
  }

  let body = req.body || {};
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({
        ok: false,
        error: 'Body JSON tidak valid.'
      });
    }
  }

  const action = String(body.action || '');

  if (!ALLOWED_ACTIONS.has(action)) {
    return res.status(400).json({
      ok: false,
      error: 'Action API tidak dikenal.'
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const upstream = await fetch(gasUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action,
        payload:
          body.payload && typeof body.payload === 'object'
            ? body.payload
            : {},
        token:
          typeof body.token === 'string'
            ? body.token
            : '',
        proxySecret
      }),
      signal: controller.signal
    });

    const raw = await upstream.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return res.status(502).json({
        ok: false,
        error: 'Respons Google Apps Script bukan JSON valid.',
        upstreamStatus: upstream.status
      });
    }

    if (!data || data.ok !== true) {
      return res.status(400).json({
        ok: false,
        error: data?.error || 'Backend Google Apps Script menolak request.'
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    const message =
      error?.name === 'AbortError'
        ? 'Backend Google Apps Script timeout.'
        : (error?.message || 'Gagal menghubungi Google Apps Script.');

    return res.status(502).json({
      ok: false,
      error: message
    });
  } finally {
    clearTimeout(timeout);
  }
}
