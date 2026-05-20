module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    var body = req.body;
    if (!body || !body.pdfBase64) {
      return res.status(400).json({ error: 'No PDF data provided' });
    }

    var apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    var prompt = 'You are analyzing an Indian credit card MITC document. Extract all details and return ONLY a valid JSON object with no markdown. Return this structure: {"name":"card name","bank":"bank name","type":"Cashback","joining":0,"annual":0,"waiver":null,"rewards":[{"cat":"Category","rate":5,"cap":null,"unit":"cashback"}],"excluded":["Fuel"],"benefits":["benefit1"],"mitc":{"Interest Rate":"3.5% per month","Foreign Markup":"3.5%"}}. Rules: joining/annual are numbers, waiver is number or null, rate is number, cap is number or null. Return ONLY the JSON.';

    var payload = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: body.pdfBase64
            }
          },
          {
            type: 'text',
            text: prompt
          }
        ]
      }]
    };

    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      var errData = await response.json();
      return res.status(500).json({ error: errData.error ? errData.error.message : 'Anthropic error' });
    }

    var data = await response.json();
    var text = data.content[0] ? data.content[0].text : '';
    var clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    var match = clean.match(/\{[\s\S]*\}/);
    var cardData = JSON.parse(match ? match[0] : clean);

    re
