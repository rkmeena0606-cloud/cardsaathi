module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    if (!req.body || !req.body.pdfBase64) return res.status(400).json({ error: 'No PDF' });
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return res.status(500).json({ error: 'No API key' });
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 2000,
        messages: [{ role: 'user', content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: req.body.pdfBase64 } },
          { type: 'text', text: 'Analyze this Indian credit card MITC PDF. Return ONLY valid JSON: {"name":"","bank":"","type":"Cashback","joining":0,"annual":0,"waiver":null,"rewards":[{"cat":"","rate":0,"cap":null,"unit":"cashback"}],"excluded":[],"benefits":[],"mitc":{}}. Extract all reward tiers, fees, excluded categories and MITC fields. Numbers only for fees and rates. No markdown, no explanation.' }
        ]}]
      })
    });
    const responseText = await r.text();
    console.log('Anthropic response status:', r.status);
    console.log('Anthropic response:', responseText.substring(0, 500));
    if (!r.ok) {
      return res.status(500).json({ error: 'Anthropic error ' + r.status + ': ' + responseText.substring(0, 200) });
    }
    const d = JSON.parse(responseText);
    const t = (d.content[0] ? d.content[0].text : '').replace(/```json|```/g, '').trim();
    const m = t.match(/\{[\s\S]*\}/);
    return res.status(200).json({ success: true, card: JSON.parse(m ? m[0] : t) });
  } catch(e) {
    console.error('Error:', e.message);
    return res.status(500).json({ error: e.message });
  }
};
