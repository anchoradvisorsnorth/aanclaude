// api/inquire.js — AAN consultation inquiry endpoint
// Sends an internal notification email to Keith via Resend (MTP account,
// sender on the verified michianatrustplanning.com domain — AAN domain
// not yet verified; swap INQUIRY_FROM when it is). No client-facing email.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const RESEND_KEY = process.env.AAN_RESEND_API_KEY;
  const FROM = process.env.INQUIRY_FROM || 'Anchor Advisors North <inquiries@michianatrustplanning.com>';
  const TO = process.env.INQUIRY_TO || 'keith@anchoradvisorsnorth.com';

  try {
    const { firstName, lastName, email, phone, state, option, message, website } = req.body || {};

    // Honeypot — bots fill every field; humans never see this one
    if (website) return res.status(200).json({ ok: true });

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email is required' });
    }

    const optionLabels = {
      simple: 'Simple Trust Plan ($1,500)',
      full: 'Full Advisory ($2,900)',
      existing: 'Existing documents, never funded',
      unsure: 'Not sure yet'
    };

    const lines = [
      `New consultation inquiry from anchoradvisorsnorth.com`,
      ``,
      `Name:    ${[firstName, lastName].filter(Boolean).join(' ') || '(not given)'}`,
      `Email:   ${email}`,
      `Phone:   ${phone || '(not given)'}`,
      `State:   ${state || '(not given)'}`,
      `Option:  ${optionLabels[option] || option || '(none selected)'}`,
      ``,
      `Situation:`,
      message || '(no message)',
      ``,
      `— Reply to this email to respond directly to the inquirer.`
    ];

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: email,
        subject: `AAN Inquiry — ${[firstName, lastName].filter(Boolean).join(' ') || email}${option ? ` (${optionLabels[option] || option})` : ''}`,
        text: lines.join('\n')
      })
    });

    if (!r.ok) {
      const err = await r.text();
      console.error('Resend error:', err);
      return res.status(502).json({ error: 'Email delivery failed' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Inquiry error:', err);
    return res.status(500).json({ error: err.message });
  }
}
