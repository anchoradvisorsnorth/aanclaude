// Meta Marketing API — month-to-date ad spend across one or more ad accounts
// Requires: META_ACCESS_TOKEN (long-lived system user token)
//           META_AD_ACCOUNT_IDS (comma-separated, e.g. "act_123,act_456")
// Docs: https://developers.facebook.com/docs/marketing-api/insights
//
// Returns: { ok, spend_mtd_usd, accounts:[{id,spend,impressions}] }

const API_VERSION = 'v22.0';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const token = process.env.META_ACCESS_TOKEN;
  const raw = process.env.META_AD_ACCOUNT_IDS;

  const missing = [];
  if (!token) missing.push('META_ACCESS_TOKEN');
  if (!raw) missing.push('META_AD_ACCOUNT_IDS');
  if (missing.length) {
    return res.status(200).json({
      ok: false,
      status: 'not_configured',
      missing,
      hint: 'Meta Business Suite → Business Settings → System Users → generate long-lived token with ads_read. Account IDs like act_1234567890.',
    });
  }

  const ids = raw.split(',').map(s => s.trim()).filter(Boolean);

  try {
    const results = [];
    let total_spend = 0;
    for (const id of ids) {
      const qs = new URLSearchParams({
        fields: 'spend,impressions,clicks,account_name',
        date_preset: 'this_month',
        access_token: token,
      });
      const r = await fetch(`https://graph.facebook.com/${API_VERSION}/${id}/insights?${qs}`);
      if (!r.ok) {
        const body = await r.text();
        results.push({ id, ok: false, http: r.status, detail: body.slice(0, 200) });
        continue;
      }
      const data = await r.json();
      const row = (data.data && data.data[0]) || {};
      const spend = parseFloat(row.spend || '0') || 0;
      total_spend += spend;
      results.push({
        id,
        name: row.account_name || id,
        spend_usd: spend,
        impressions: parseInt(row.impressions || '0', 10),
        clicks: parseInt(row.clicks || '0', 10),
      });
    }

    return res.status(200).json({
      ok: true,
      spend_mtd_usd: Math.round(total_spend * 100) / 100,
      accounts: results,
    });
  } catch (err) {
    return res.status(200).json({ ok: false, status: 'fetch_error', detail: String(err.message || err).slice(0, 300) });
  }
}
