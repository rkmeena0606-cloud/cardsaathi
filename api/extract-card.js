export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { pdfBase64 } = req.body;
    if (!pdfBase64) return res.status(400).json({ error: 'No PDF data provided' });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': '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',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 }
            },
            {
              type: 'text',
              text: `You are analyzing an Indian credit card MITC document. Extract all details and return ONLY a valid JSON object with no markdown, no explanation.

Return this exact structure:
{
  "name": "Full card name",
  "bank": "Bank name",
  "type": "Cashback or Points or Miles",
  "joining": 0,
  "annual": 0,
  "waiver": null,
  "rewards": [{"cat": "Category", "rate": 5, "cap": null, "unit": "cashback"}],
  "excluded": ["Fuel", "Wallet"],
  "benefits": ["Benefit 1", "Benefit 2"],
  "mitc": {
    "Interest Rate": "3.5% per month",
    "Grace Period": "20-50 days",
    "Cash Advance Fee": "2.5% or min 500",
    "Late Payment Fee": "As per slab",
    "Foreign Markup": "3.5%"
  }
}

Rules: joining/annual must be numbers, waiver is number or null, reward rate is a number, cap is number or null. Return ONLY the JSON.`
            }
          ]
        })
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(500).json({ error: err.error?.message || 'Anthropic API error' });
    }

    const data = await response.json();
    const text = data.content[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const match = clean.match(/\{[\s\S]*\}/);
    const cardData = JSON.parse(match ? match[0] : clean);

    return res.status(200).json({ success: true, card: cardData });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
