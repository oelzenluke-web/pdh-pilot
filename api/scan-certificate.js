module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('scan-certificate error: ANTHROPIC_API_KEY is not set');
    return res.status(500).json({ error: 'Server misconfiguration: missing AI key' });
  }

  const body = req.body || {};
  const { image, mediaType } = body;

  if (!image || !mediaType) {
    return res.status(400).json({ error: 'Missing image or mediaType' });
  }

  try {
    const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            { type: 'text', text: "This is a continuing-education / PDH completion certificate. Extract the fields and respond with ONLY a JSON object, no markdown, no preamble. Keys: title (course/activity name), provider (issuing organization), date (completion date as YYYY-MM-DD, empty string if unclear), hours (number of PDH/CE hours as a number), category (one of: technical, ethics, other — use 'ethics' for ethics, laws, rules, or professional conduct content). If a field is unknown use an empty string or 0." }
          ]
        }]
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error('scan-certificate: Anthropic API error', aiResp.status, errText);
      return res.status(502).json({ error: 'AI service error' });
    }

    const data = await aiResp.json();
    const text = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('').replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (parseErr) {
      console.error('scan-certificate: failed to parse AI response', text);
      return res.status(502).json({ error: 'Could not parse AI response' });
    }

    res.json(parsed);
  } catch (err) {
    console.error('scan-certificate error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
