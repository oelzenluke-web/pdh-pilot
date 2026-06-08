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

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      automatic_tax: { enabled: true },
      success_url: `${appUrl}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/?canceled=1`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('create-checkout-session error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
