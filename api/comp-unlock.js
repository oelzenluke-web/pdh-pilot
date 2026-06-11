module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const compCode = process.env.COMP_UNLOCK_CODE;
  if (!compCode) {
    console.error('comp-unlock error: COMP_UNLOCK_CODE is not set');
    return res.status(500).json({ ok: false, error: 'Server misconfiguration' });
  }

  const body = req.body || {};
  const submitted = typeof body.code === 'string' ? body.code.trim() : '';

  if (!submitted || submitted !== compCode) {
    return res.status(401).json({ ok: false });
  }

  res.json({ ok: true });
};
