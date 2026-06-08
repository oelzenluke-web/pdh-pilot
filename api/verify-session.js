const Stripe = require('stripe');

module.exports = async (req, res) => {
  const { session_id } = req.query;

  if (!session_id) {
    return res.status(400).json({ paid: false, error: 'Missing session_id' });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(session_id);
    res.json({ paid: session.payment_status === 'paid' });
  } catch (err) {
    console.error('verify-session error:', err.message);
    res.status(500).json({ paid: false, error: err.message });
  }
};
