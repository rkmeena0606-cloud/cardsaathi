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
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: req.body.pdfBase64 }
            },
            {
              type: 'text',
              text: 'Analyze this Indian credit card MITC PDF. Return ONLY a valid JSON object, no markdown, no extra text. Use this exact structure: {"name":"card name","bank":"bank name","type":"Cashback","joining":0,"annual":0,"waiver":null,"rewards":[{"cat":"category name","rate":5,"cap":null,"unit":"cashback"}],"excluded":["Fuel","Wallet"],"benefits":["benefit 1","benefit 2"],"mitc":{"Interest Rate":"3.5% per month","Foreign Markup":"3.5%"}}. Important: all numbers must be plain numbers not strings, cap must be null or a number, waiver must be null or a number. Keep benefit strings short under 80 characters each. Keep mitc values short under 60 characters each.'
            }
          ]
        }]
      })
    });
    const responseText = await r.text();
    if (!r.ok) return res.status(500).json({ error: responseText.substring(0, 200) });
    const d = JSON.parse(responseText);
    let text = d.content && d.content[0] ? d.content[0].text : '';
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) return res.status(500).json({ error: 'No JSON found in response' });
    const jsonStr = text.substring(start, end + 1);
    const card = JSON.parse(jsonStr);
    return res.status(200).json({ success: true, card: card });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
