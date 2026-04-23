// Stripe — month-to-date gross revenue + active subscription MRR estimate
// Requires: STRIPE_SECRET_KEY (sk_live_... or sk_test_...)
// Docs: https://docs.stripe.com/api/charges/list
//
// Returns: { ok, revenue_mtd_usd, active_subs, mrr_usd, starting_at }

function monthStartUnix() {
  const now = new Date();
  return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000);
}

async function stripeGet(path, key) {
  const r = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Stripe ${path} ${r.status}: ${body.slice(0, 300)}`);
  }
  return r.json();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return res.status(200).json({
      ok: false,
      status: 'not_configured',
      missing: ['STRIPE_SECRET_KEY'],
      hint: 'Stripe Dashboard → Developers → API keys. Use a restricted key with read-only scopes.',
    });
  }

  const start = monthStartUnix();

  try {
    // MTD revenue: sum successful charges since month start.
    // Paginate up to 1000 charges (should be more than enough for MTP workbook volume).
    let revenue_mtd = 0;
    let charge_count = 0;
    let starting_after = null;
    for (let page = 0; page < 10; page++) {
      const qs = new URLSearchParams({
        limit: '100',
        [`created[gte]`]: String(start),
      });
      if (starting_after) qs.set('starting_after', starting_after);
      const data = await stripeGet(`/charges?${qs}`, key);
      for (const c of data.data || []) {
        if (c.paid && !c.refunded && c.status === 'succeeded') {
          revenue_mtd += (c.amount || 0) / 100;
          charge_count++;
        }
      }
      if (!data.has_more) break;
      starting_after = data.data[data.data.length - 1]?.id;
      if (!starting_after) break;
    }

    // Active subscriptions → MRR estimate (normalize yearly to monthly).
    let active_subs = 0;
    let mrr_usd = 0;
    let sub_starting_after = null;
    for (let page = 0; page < 5; page++) {
      const qs = new URLSearchParams({ limit: '100', status: 'active' });
      if (sub_starting_after) qs.set('starting_after', sub_starting_after);
      const data = await stripeGet(`/subscriptions?${qs}`, key);
      for (const s of data.data || []) {
        active_subs++;
        for (const item of s.items?.data || []) {
          const price = item.price || {};
          const unit = (price.unit_amount || 0) / 100;
          const qty = item.quantity || 1;
          const interval = price.recurring?.interval || 'month';
          const count = price.recurring?.interval_count || 1;
          let monthly = unit * qty;
          if (interval === 'year') monthly = monthly / 12;
          else if (interval === 'week') monthly = monthly * 4.345;
          else if (interval === 'day') monthly = monthly * 30;
          if (count > 1) monthly = monthly / count;
          mrr_usd += monthly;
        }
      }
      if (!data.has_more) break;
      sub_starting_after = data.data[data.data.length - 1]?.id;
      if (!sub_starting_after) break;
    }

    return res.status(200).json({
      ok: true,
      revenue_mtd_usd: Math.round(revenue_mtd * 100) / 100,
      charge_count,
      active_subs,
      mrr_usd: Math.round(mrr_usd * 100) / 100,
      starting_at: new Date(start * 1000).toISOString(),
    });
  } catch (err) {
    return res.status(200).json({ ok: false, status: 'fetch_error', detail: String(err.message || err).slice(0, 300) });
  }
}
