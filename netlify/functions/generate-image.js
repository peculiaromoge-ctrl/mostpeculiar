// Server-side only. Uses Hugging Face's free Inference API (FLUX.1-schnell)
// instead of OpenAI, so there is no per-image cost. The HF token lives in
// Netlify's environment variables (Site settings -> Environment variables ->
// HF_API_TOKEN), never in this repo or the frontend.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const hfToken = process.env.HF_API_TOKEN;
  if (!hfToken) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server is missing HF_API_TOKEN' }) };
  }

  let prompt, size;
  try {
    ({ prompt, size } = JSON.parse(event.body || '{}'));
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }
  if (!prompt || !prompt.trim()) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing prompt' }) };
  }

  // size comes in as "1024x1024" / "1024x1536" / "1536x1024" from the frontend
  let width = 1024, height = 1024;
  if (typeof size === 'string' && size.includes('x')) {
    const [w, h] = size.split('x').map(Number);
    if (w && h) { width = w; height = h; }
  }

  try {
    const hfResp = await fetch('https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { width, height },
      }),
    });

    if (!hfResp.ok) {
      let errMsg = 'Hugging Face request failed';
      try {
        const errData = await hfResp.json();
        if (errData.error) {
          errMsg = errData.estimated_time
            ? `Model is waking up — try again in about ${Math.ceil(errData.estimated_time)}s.`
            : errData.error;
        }
      } catch (e) {}
      return { statusCode: hfResp.status, body: JSON.stringify({ error: errMsg }) };
    }

    const arrayBuffer = await hfResp.arrayBuffer();
    const b64 = Buffer.from(arrayBuffer).toString('base64');

    return { statusCode: 200, body: JSON.stringify({ b64 }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Unexpected server error' }) };
  }
};
