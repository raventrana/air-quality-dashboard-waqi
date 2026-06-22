/**
 * Vercel Serverless Function: WAQI API Proxy
 * Securely fetches air quality station data without exposing the API token key to the client browser.
 */

module.exports = async (req, res) => {
  // Set CORS headers for Vercel
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { lat, lng, customToken } = req.query;

  if (!lat || !lng) {
    res.status(400).json({ status: 'error', data: 'Missing latitude (lat) or longitude (lng) parameters.' });
    return;
  }

  // Retrieve token securely from server-side environment variables, or fallback to user custom key override
  const token = customToken || process.env.WAQI_TOKEN || process.env.WAQI_API_KEY;

  if (!token) {
    res.status(500).json({ 
      status: 'error', 
      data: 'WAQI token is not configured on the Vercel server. Set the WAQI_TOKEN environment variable.' 
    });
    return;
  }

  const url = `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${token}`;

  try {
    const apiResponse = await fetch(url);
    if (!apiResponse.ok) {
      res.status(apiResponse.status).json({ status: 'error', data: 'WAQI remote station returned a network error.' });
      return;
    }

    const data = await apiResponse.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Serverless function proxy error:', error);
    res.status(500).json({ status: 'error', data: 'Internal Server Error fetching WAQI station feed.' });
  }
};
