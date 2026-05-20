module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const key = process.env.ANTHROPIC_API_KEY;
  res.status(200).json({ 
    success: true, 
    keyExists: !!key,
    keyStart: key ? key.substring(0, 15) : 'none',
    body: req.body ? 'has body' : 'no body'
  });
};
