const Stripe = require('stripe');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId   = process.env.STRIPE_PRICE_ID;

  // Guard: catch missing env vars before touching Stripe
  if (!secretKey) {
    console.error('create-checkout-session error: STRIPE_SECRET_KEY is not set');
    return res.status(500).json({ error: 'Server misconfiguration: missing Stripe key' });
  }
  if (!priceId) {
    console.error('create-checkout-session error: STRIPE_PRICE_ID is not set');
    return res.status(500).json({ error: 'Server misconfiguration: missing price ID' });
  }

  const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' });

  // Derive app URL from request so success/cancel URLs work on any deploy
  const proto  = req.headers['x-forwarded-proto'] || 'https';
  const host   = req.headers['x-forwarded-host'] || req.headers.host;
  const appUrl = `${proto}://${host}`;

  // Clickwrap consent — captured client-side at the moment the user checks the box
  const body = req.body || {};
  const tosAcceptedAt = typeof body.tos_accepted_at === 'string' ? body.tos_accepted_at : new Date().toISOString();
  const tosVersion    = typeof body.tos_version === 'string' ? body.tos_version : 'unknown';

  const baseParams = {
    mode: 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      tos_accepted_at: tosAcceptedAt,
      tos_version: tosVersion,
    },
    success_url: `${appUrl}/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${appUrl}/?canceled=1`,
  };

  try {
    // Stripe Tax should be on (ToS says tax is added "where applicable").
    // If the account isn't fully configured for it yet (e.g. missing head
    // office address in test mode), fall back so checkout still works.
    let session;
    try {
      session = await stripe.checkout.sessions.create({
        ...baseParams,
        automatic_tax: { enabled: true },
      });
    } catch (taxErr) {
      console.error('create-checkout-session: automatic_tax failed, retrying without it:', taxErr.message);
      session = await stripe.checkout.sessions.create(baseParams);
    }

    res.json({ url: session.url });
  } catch (err) {
    console.error('create-checkout-session error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
