// Azure Cost Management — month-to-date actual spend for one subscription
// Requires: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_SUBSCRIPTION_ID
// Docs: https://learn.microsoft.com/rest/api/cost-management/query/usage
//
// Returns: { ok, cost_usd, currency, starting_at, ending_at }

async function getToken({ tenant, client_id, client_secret }) {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id,
    client_secret,
    scope: 'https://management.azure.com/.default',
  });
  const r = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`AAD token ${r.status}: ${t.slice(0, 300)}`);
  }
  const j = await r.json();
  return j.access_token;
}

function monthStartISODate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}
function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');

  const tenant = process.env.AZURE_TENANT_ID;
  const client_id = process.env.AZURE_CLIENT_ID;
  const client_secret = process.env.AZURE_CLIENT_SECRET;
  const sub = process.env.AZURE_SUBSCRIPTION_ID;

  const missing = [];
  if (!tenant) missing.push('AZURE_TENANT_ID');
  if (!client_id) missing.push('AZURE_CLIENT_ID');
  if (!client_secret) missing.push('AZURE_CLIENT_SECRET');
  if (!sub) missing.push('AZURE_SUBSCRIPTION_ID');
  if (missing.length) {
    return res.status(200).json({
      ok: false,
      status: 'not_configured',
      missing,
      hint: 'Register app in Entra ID, grant Cost Management Reader on the subscription, use client_credentials.',
    });
  }

  try {
    const token = await getToken({ tenant, client_id, client_secret });
    const start = monthStartISODate();
    const end = todayISODate();

    const url = `https://management.azure.com/subscriptions/${sub}/providers/Microsoft.CostManagement/query?api-version=2023-03-01`;
    const payload = {
      type: 'ActualCost',
      timeframe: 'Custom',
      timePeriod: { from: `${start}T00:00:00+00:00`, to: `${end}T23:59:59+00:00` },
      dataset: {
        granularity: 'None',
        aggregation: { totalCost: { name: 'Cost', function: 'Sum' } },
      },
    };

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const body = await r.text();
      return res.status(200).json({ ok: false, status: 'api_error', http: r.status, detail: body.slice(0, 500) });
    }
    const data = await r.json();

    // data.properties.rows[0] = [cost, currency] per schema (columns indexed)
    const rows = data?.properties?.rows || [];
    const cols = data?.properties?.columns || [];
    let cost = 0;
    let currency = 'USD';
    if (rows.length && cols.length) {
      const costIdx = cols.findIndex(c => (c.name || '').toLowerCase() === 'cost');
      const curIdx = cols.findIndex(c => (c.name || '').toLowerCase() === 'currency');
      cost = rows[0][costIdx >= 0 ? costIdx : 0];
      if (curIdx >= 0) currency = rows[0][curIdx];
    }

    return res.status(200).json({
      ok: true,
      cost_usd: Math.round((cost || 0) * 100) / 100,
      currency,
      starting_at: start,
      ending_at: end,
    });
  } catch (err) {
    return res.status(200).json({ ok: false, status: 'fetch_error', detail: String(err.message || err).slice(0, 300) });
  }
}
