// Resend — month-to-date send counts across up to three accounts (CS / MTP / AAN)
// Requires at least one of:
//   RESEND_CS_API_KEY, RESEND_MTP_API_KEY, RESEND_AAN_API_KEY
// Docs: https://resend.com/docs/api-reference/emails/list-emails
//
// Free-tier cap: 100/day, 3,000/mo per account.
//
// Returns: { ok, total, cap, accounts:[{label, count, cap, ok}] }

const MONTHLY_CAP = 3000;

function monthStartISO() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

async function countAccount(label, apiKey) {
  if (!apiKey) return { label, ok: false, status: 'not_configured' };

  const start = monthStartISO();
  try {
    // Paginate the emails list. `created_at` filter not universally supported on the
    // list endpoint yet — we page back until we see emails older than month start.
    let cursor = null;
    let total = 0;
    for (let page = 0; page < 20; page++) {
      const qs = new URLSearchParams({ limit: '100' });
      if (cursor) qs.set('after', cursor);
      const r = await fetch(`https://api.resend.com/emails?${qs}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!r.ok) {
        const body = await r.text();
        return { label, ok: false, status: 'api_error', http: r.status, detail: body.slice(0, 200) };
      }
      const data = await r.json();
      const rows = data.data || data || [];
      if (!Array.isArray(rows) || rows.length === 0) break;
      let stopAfterPage = false;
      for (const e of rows) {
        const created = e.created_at || e.createdAt || e.created;
        if (created && created >= start) {
          total++;
        } else if (created) {
          stopAfterPage = true;
        }
      }
      if (stopAfterPage) break;
      cursor = rows[rows.length - 1]?.id;
      if (!cursor) break;
    }

    return { label, ok: true, count: total, cap: MONTHLY_CAP };
  } catch (err) {
    return { label, ok: false, status: 'fetch_error', detail: String(err.message || err).slice(0, 200) };
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');

  const accounts = await Promise.all([
    countAccount('CS',  process.env.RESEND_CS_API_KEY),
    countAccount('MTP', process.env.RESEND_MTP_API_KEY),
    countAccount('AAN', process.env.RESEND_AAN_API_KEY),
  ]);

  const configured = accounts.filter(a => a.ok);
  if (configured.length === 0) {
    return res.status(200).json({
      ok: false,
      status: 'not_configured',
      missing: ['RESEND_CS_API_KEY', 'RESEND_MTP_API_KEY', 'RESEND_AAN_API_KEY'],
      hint: 'At least one of the three Resend keys must be set.',
      accounts,
    });
  }

  const total = configured.reduce((s, a) => s + (a.count || 0), 0);
  const cap = MONTHLY_CAP * configured.length;
  return res.status(200).json({
    ok: true,
    total,
    cap,
    pct: Math.round((total / cap) * 100),
    accounts,
  });
}
