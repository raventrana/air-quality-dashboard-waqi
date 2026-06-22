/**
 * Vercel Serverless Function: WAQI Token Connection Validator
 * Securely checks if the configured server-side token or custom token is valid.
 */

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { customToken } = req.query;
  const token = customToken || process.env.WAQI_TOKEN || process.env.WAQI_API_KEY;

  if (!token) {
    res.status(200).json({ status: 'error', ok: false, message: 'No API token found in environment variables.' });
    return;
  }

  // Hit the standard general feed for Shanghai to test the token
  const url = `https://api.waqi.info/feed/shanghai/?token=${token}`;

  try {
    const apiResponse = await fetch(url);
    if (!apiResponse.ok) {
      res.status(200).json({ status: 'error', ok: false, message: 'Failed to contact WAQI validation servers.' });
      return;
    }

    const data = await apiResponse.json();
    if (data.status === 'ok') {
      res.status(200).json({ status: 'ok', ok: true, message: 'Authentication successful.' });
    } else {
      res.status(200).json({ status: 'error', ok: false, message: data.data || 'Invalid token.' });
    }
  } catch (error) {
    console.error('Serverless token check error:', error);
    res.status(500).json({ status: 'error', ok: false, message: 'Internal server error validating token.' });
  }
};
