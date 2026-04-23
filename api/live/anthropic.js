// Anthropic Admin API — month-to-date cost report
// Requires: ANTHROPIC_ADMIN_KEY (sk-ant-admin01-...)
// Docs: https://docs.anthropic.com/en/api/admin-api/usage-cost
//
// Returns: { ok, cost_usd, starting_at, ending_at, source }

const ANTHROPIC_VERSION = '2023-06-01';

function monthStartISO() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const key = process.env.ANTHROPIC_ADMIN_KEY;
  if (!key) {
    return res.status(200).json({
      ok: false,
      status: 'not_configured',
      missing: ['ANTHROPIC_ADMIN_KEY'],
      hint: 'Create an Admin Key in Anthropic Console → Settings → Admin Keys.',
    });
  }

  const starting_at = monthStartISO();
  const url = `https://api.anthropic.com/v1/organizations/cost_report?starting_at=${encodeURIComponent(starting_at)}&bucket_width=1d`;

  try {
    const r = await fetch(url, {
      headers: {
        'x-api-key': key,
        'anthropic-version': ANTHROPIC_VERSION,
      },
    });
    if (!r.ok) {
      const body = await r.text();
      return res.status(200).json({ ok: false, status: 'api_error', http: r.status, detail: body.slice(0, 500) });
    }
    const data = await r.json();

    // Sum cost across all daily buckets + all line items in each bucket.
    // Shape is defensively parsed in case schema shifts.
    let cost_usd = 0;
    const buckets = Array.isArray(data.data) ? data.data : [];
    for (const b of buckets) {
      const results = Array.isArray(b.results) ? b.results : [];
      for (const r of results) {
        // Prefer explicit amount_usd, fall back to unit_cost_usd * count patterns.
        const v =
          typeof r.amount_usd === 'number' ? r.amount_usd :
          typeof r.cost_usd === 'number' ? r.cost_usd :
          (typeof r.unit_cost_usd === 'number' && typeof r.units === 'number') ? r.unit_cost_usd * r.units : 0;
        cost_usd += v || 0;
      }
    }

    return res.status(200).json({
      ok: true,
      cost_usd: Math.round(cost_usd * 100) / 100,
      starting_at,
      ending_at: new Date().toISOString(),
      source: 'anthropic.cost_report',
      buckets: buckets.length,
    });
  } catch (err) {
    return res.status(200).json({ ok: false, status: 'fetch_error', detail: String(err).slice(0, 300) });
  }
}
